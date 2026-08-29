use anyhow::Result;
use break_detector_engine::code_diff::check_code_migration;
use break_detector_engine::config::TM3LConfig;
use break_detector_engine::diff::compare_specs;
use tonic::{transport::Server, Request, Response, Status};

pub mod pb {
    tonic::include_proto!("analyzer");
}

use pb::analyzer_service_server::{AnalyzerService, AnalyzerServiceServer};
use pb::{AnalyzeRequest, AnalyzeResponse};

#[derive(Default)]
pub struct MyAnalyzerService {}

#[derive(serde::Deserialize)]
struct OpenApiPayload {
    base: openapiv3::OpenAPI,
    target: openapiv3::OpenAPI,
}

#[tonic::async_trait]
impl AnalyzerService for MyAnalyzerService {
    async fn analyze_code(
        &self,
        request: Request<AnalyzeRequest>,
    ) -> std::result::Result<Response<AnalyzeResponse>, Status> {
        let req = request.into_inner();
        let config = TM3LConfig::default();

        let json_result = if req.mode == "python_migration" || req.mode == "code_migration" {
            let lang = if req.mode == "python_migration" && req.language == "python" {
                "python"
            } else {
                &req.language
            };
            let result = check_code_migration(&req.source_code, lang);
            serde_json::to_string(&result).map_err(|e| Status::internal(e.to_string()))?
        } else if req.mode == "analyze" {
            let result = break_detector_engine::analyzer::analyze_code(&req.source_code, &req.language);
            serde_json::to_string(&result).map_err(|e| Status::internal(e.to_string()))?
        } else if req.mode == "openapi" {
            let payload: OpenApiPayload = serde_json::from_str(&req.source_code)
                .map_err(|e| Status::invalid_argument(format!("Failed to parse openapi payload: {}", e)))?;
            let result = compare_specs(&payload.base, &payload.target, &config);
            serde_json::to_string(&result).map_err(|e| Status::internal(e.to_string()))?
        } else {
            return Err(Status::invalid_argument(format!("Unknown mode: {}", req.mode)));
        };

        Ok(Response::new(AnalyzeResponse { json_result }))
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let addr = "0.0.0.0:50051".parse().unwrap();
    let service = MyAnalyzerService::default();

    println!("Starting gRPC server on {}", addr);

    Server::builder()
        .add_service(AnalyzerServiceServer::new(service))
        .serve(addr)
        .await?;

    Ok(())
}
