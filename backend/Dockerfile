# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY Directory.Build.props BrainMemo.sln ./
COPY src/ ./src/

RUN dotnet restore src/Host/BrainMemo.WebApi/BrainMemo.WebApi.csproj \
    && dotnet publish src/Host/BrainMemo.WebApi/BrainMemo.WebApi.csproj \
        --configuration Release \
        --no-restore \
        --output /app/publish \
        /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Install curl for container HEALTHCHECK against GET /health, then run as non-root user.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish ./

ENV ASPNETCORE_HTTP_PORTS=8080 \
    ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

USER $APP_UID

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
    CMD ["curl", "-fsS", "http://127.0.0.1:8080/health"]

ENTRYPOINT ["dotnet", "BrainMemo.WebApi.dll"]

