// ============================================
// TRADING PLATFORM BACKEND
// High-performance Rust backend
// ============================================

mod api;
mod ws;
mod exchanges;
mod indicators;
mod trading;
mod db;
mod cache;
mod config;
mod error;

use actix_cors::Cors;
use actix_web::{web, App, HttpServer, middleware};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::config::Config;
use crate::db::Database;
use crate::cache::Cache;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Инициализация логирования
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "trading_platform=info,actix_web=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Загрузка конфигурации
    let config = Config::load().expect("Failed to load config");

    // Инициализация базы данных
    let db = Database::connect(&config.database_url)
        .await
        .expect("Failed to connect to database");

    // Инициализация кэша
    let cache = Cache::connect(&config.redis_url)
        .await
        .expect("Failed to connect to Redis");

    // Инициализация коннекторов бирж
    let exchange_manager = exchanges::ExchangeManager::new(&config);

    let config_clone = config.clone();
    let db_clone = db.clone();
    let cache_clone = cache.clone();

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .wrap(middleware::Logger::default())
            .app_data(web::Data::new(config_clone.clone()))
            .app_data(web::Data::new(db_clone.clone()))
            .app_data(web::Data::new(cache_clone.clone()))
            .app_data(web::Data::new(exchange_manager.clone()))
            // API Routes
            .configure(api::routes::configure)
            // WebSocket endpoint
            .route("/ws", web::get().to(ws::handler::ws_handler))
    })
    .bind(("0.0.0.0", 8080))?
    .workers(config.workers)
    .run()
    .await
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, App};

    #[actix_rt::test]
    async fn test_health_check() {
        let app = test::init_service(
            App::new().route("/health", web::get().to(|| async { "OK" }))
        ).await;

        let req = test::TestRequest::get().uri("/health").to_request();
        let resp = test::call_service(&app, req).await;

        assert!(resp.status().is_success());
    }
}
