using Architecture.Tests.Support;
using Mono.Cecil;
using Mono.Cecil.Cil;
using NetArchTest.Rules;

namespace Architecture.Tests.Rules;

/// <summary>
/// Enforces REPO_STRUCTURE §2 rule 9: purpose=MODERATION_REVIEW may only be passed from Moderation.
/// </summary>
public sealed class ModerationReviewPurposeRule : ICustomRule
{
    public bool MeetsRule(TypeDefinition type)
    {
        ArgumentNullException.ThrowIfNull(type);

        string assemblyName = type.Module?.Assembly?.Name?.Name ?? string.Empty;
        if (ModuleArchitectureSpec.IsModerationAssembly(assemblyName))
        {
            return true;
        }

        bool isCourseAssembly = ModuleArchitectureSpec.IsCourseAssembly(assemblyName);
        return TypeCompliesRecursive(type, isCourseAssembly);
    }

    private static bool TypeCompliesRecursive(TypeDefinition type, bool isCourseAssembly)
    {
        foreach (MethodDefinition method in type.Methods)
        {
            if (method.HasBody && !MethodComplies(method, isCourseAssembly))
            {
                return false;
            }
        }

        foreach (TypeDefinition nested in type.NestedTypes)
        {
            if (!TypeCompliesRecursive(nested, isCourseAssembly))
            {
                return false;
            }
        }

        return true;
    }

    private static bool MethodComplies(MethodDefinition method, bool isCourseAssembly)
    {
        MethodBody body = method.Body;
        HashSet<Instruction> branchTargets = CollectBranchTargets(body);

        foreach (Instruction instruction in body.Instructions)
        {
            if (!isCourseAssembly
                && instruction.OpCode.Code == Code.Ldstr
                && instruction.Operand is string literal
                && IsModerationReviewString(literal))
            {
                return false;
            }

            if (instruction.OpCode.Code is not (Code.Call or Code.Callvirt or Code.Newobj))
            {
                continue;
            }

            if (instruction.Operand is not MethodReference callee || !callee.HasParameters)
            {
                continue;
            }

            bool isContractTarget = IsContractType(callee.DeclaringType);

            // Course may forward AccessPurpose internally while implementing GetCourseAccess,
            // but even Course must not call a contract passing ModerationReview.
            if (isCourseAssembly && !isContractTarget)
            {
                continue;
            }

            for (int i = 0; i < callee.Parameters.Count; i++)
            {
                ParameterDefinition parameter = callee.Parameters[i];
                if (!IsAccessPurposeParameter(parameter))
                {
                    continue;
                }

                int depthFromTop = (callee.Parameters.Count - 1) - i;
                Instruction? producer = TryFindStackProducer(instruction, depthFromTop, branchTargets);
                if (!IsNormalConstantProducer(producer, parameter))
                {
                    return false;
                }
            }
        }

        return true;
    }

    private static bool IsContractType(TypeReference? typeReference)
    {
        if (typeReference is null)
        {
            return false;
        }

        string ns = typeReference.Namespace ?? string.Empty;
        return ns.Contains(".Contracts", StringComparison.Ordinal)
            || string.Equals(typeReference.Name, "ICourseContract", StringComparison.Ordinal);
    }

    private static bool IsAccessPurposeParameter(ParameterDefinition parameter)
    {
        TypeReference paramType = parameter.ParameterType;
        string typeName = paramType.Name;
        if (string.Equals(typeName, "AccessPurpose", StringComparison.Ordinal)
            || string.Equals(typeName, "CourseAccessPurpose", StringComparison.Ordinal))
        {
            return true;
        }

        if (string.Equals(parameter.Name, "purpose", StringComparison.OrdinalIgnoreCase))
        {
            if (paramType.MetadataType == MetadataType.String)
            {
                return true;
            }

            TypeDefinition? resolved = TryResolve(paramType);
            return resolved is { IsEnum: true }
                && resolved.Fields.Any(static field =>
                    field.HasConstant && IsModerationReviewString(field.Name));
        }

        return false;
    }

    private static TypeDefinition? TryResolve(TypeReference typeReference)
    {
        try
        {
            return typeReference.Resolve();
        }
        catch (AssemblyResolutionException)
        {
            return null;
        }
    }

    private static bool IsModerationReviewString(string value) =>
        string.Equals(value, "MODERATION_REVIEW", StringComparison.OrdinalIgnoreCase)
        || string.Equals(value, "ModerationReview", StringComparison.OrdinalIgnoreCase);

    private static bool IsNormalConstantProducer(Instruction? producer, ParameterDefinition parameter)
    {
        if (producer is null)
        {
            return false;
        }

        if (parameter.ParameterType.MetadataType == MetadataType.String)
        {
            return producer.OpCode.Code == Code.Ldstr
                && producer.Operand is string str
                && !IsModerationReviewString(str);
        }

        return producer.OpCode.Code == Code.Ldc_I4_0
            || (producer.OpCode.Code is Code.Ldc_I4 or Code.Ldc_I4_S
                && Convert.ToInt32(producer.Operand, System.Globalization.CultureInfo.InvariantCulture) == 0);
    }

    private static HashSet<Instruction> CollectBranchTargets(MethodBody body)
    {
        HashSet<Instruction> targets = [];

        foreach (Instruction instruction in body.Instructions)
        {
            if (instruction.Operand is Instruction singleTarget)
            {
                targets.Add(singleTarget);
            }
            else if (instruction.Operand is Instruction[] switchTargets)
            {
                foreach (Instruction target in switchTargets)
                {
                    targets.Add(target);
                }
            }
        }

        foreach (ExceptionHandler handler in body.ExceptionHandlers)
        {
            if (handler.TryStart is not null)
            {
                targets.Add(handler.TryStart);
            }

            if (handler.HandlerStart is not null)
            {
                targets.Add(handler.HandlerStart);
            }

            if (handler.FilterStart is not null)
            {
                targets.Add(handler.FilterStart);
            }
        }

        return targets;
    }

    private static Instruction? TryFindStackProducer(
        Instruction callInstruction,
        int depthFromTop,
        HashSet<Instruction> branchTargets)
    {
        int remainingAbove = depthFromTop;
        Instruction nextInstruction = callInstruction;
        Instruction? current = callInstruction.Previous;

        while (current is not null)
        {
            if (branchTargets.Contains(nextInstruction))
            {
                return null;
            }

            if (current.OpCode.Code == Code.Nop)
            {
                nextInstruction = current;
                current = current.Previous;
                continue;
            }

            if (current.OpCode.FlowControl is FlowControl.Branch
                or FlowControl.Cond_Branch
                or FlowControl.Return
                or FlowControl.Throw)
            {
                return null;
            }

            if (!TryGetStackDelta(current, out int pops, out int pushes))
            {
                return null;
            }

            if (current.OpCode.Code == Code.Dup)
            {
                if (remainingAbove <= 1)
                {
                    remainingAbove = 0;
                    nextInstruction = current;
                    current = current.Previous;
                    continue;
                }

                remainingAbove -= 1;
                nextInstruction = current;
                current = current.Previous;
                continue;
            }

            if (remainingAbove < pushes)
            {
                return current;
            }

            remainingAbove = remainingAbove - pushes + pops;
            nextInstruction = current;
            current = current.Previous;
        }

        return null;
    }

    private static bool TryGetStackDelta(Instruction instruction, out int pops, out int pushes)
    {
        pops = 0;
        pushes = 0;

        switch (instruction.OpCode.StackBehaviourPop)
        {
            case StackBehaviour.Pop0:
                pops = 0;
                break;
            case StackBehaviour.Pop1:
            case StackBehaviour.Popi:
            case StackBehaviour.Popref:
                pops = 1;
                break;
            case StackBehaviour.Pop1_pop1:
            case StackBehaviour.Popi_pop1:
            case StackBehaviour.Popi_popi:
            case StackBehaviour.Popi_popi8:
            case StackBehaviour.Popi_popr4:
            case StackBehaviour.Popi_popr8:
            case StackBehaviour.Popref_pop1:
            case StackBehaviour.Popref_popi:
                pops = 2;
                break;
            case StackBehaviour.Popi_popi_popi:
            case StackBehaviour.Popref_popi_popi:
            case StackBehaviour.Popref_popi_popi8:
            case StackBehaviour.Popref_popi_popr4:
            case StackBehaviour.Popref_popi_popr8:
            case StackBehaviour.Popref_popi_popref:
                pops = 3;
                break;
            case StackBehaviour.Varpop:
                if (instruction.Operand is MethodReference methodRef)
                {
                    bool takesThis = methodRef.HasThis && instruction.OpCode.Code != Code.Newobj;
                    pops = (takesThis ? 1 : 0) + methodRef.Parameters.Count;
                    break;
                }

                return false;
            default:
                return false;
        }

        switch (instruction.OpCode.StackBehaviourPush)
        {
            case StackBehaviour.Push0:
                pushes = 0;
                break;
            case StackBehaviour.Push1:
            case StackBehaviour.Pushi:
            case StackBehaviour.Pushi8:
            case StackBehaviour.Pushr4:
            case StackBehaviour.Pushr8:
            case StackBehaviour.Pushref:
                pushes = 1;
                break;
            case StackBehaviour.Push1_push1:
                pushes = 2;
                break;
            case StackBehaviour.Varpush:
                if (instruction.Operand is MethodReference methodRef)
                {
                    pushes = instruction.OpCode.Code == Code.Newobj
                        || methodRef.ReturnType.MetadataType != MetadataType.Void
                        ? 1
                        : 0;
                    break;
                }

                return false;
            default:
                return false;
        }

        return true;
    }
}

