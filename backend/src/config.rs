// ============================================
// CONFIGURATION
// Конфигурация приложения
// ============================================

use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub server_host: String,
    pub server_port: u16,
    pub workers: usize,
    pub database_url: String,
    pub redis_url: String,
    pub binance_keys: Option<ExchangeKeys>,
    pub bybit_keys: Option<ExchangeKeys>,
    pub okx_keys: Option<ExchangeKeys>,
    pub bitget_keys: Option<ExchangeKeys>,
    pub bingx_keys: Option<ExchangeKeys>,
    pub jwt_secret: String,
    pub cors_origins: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExchangeKeys {
    pub api_key: String,
    pub api_secret: String,
}

impl Config {
    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        dotenvy::dotenv().ok();

        Ok(Self {
            server_host: env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            server_port: env::var("SERVER_PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()?,
            workers: env::var("WORKERS")
                .unwrap_or_else(|_| "4".to_string())
                .parse()?,
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/trading".to_string()),
            redis_url: env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://localhost:6379".to_string()),
            binance_keys: ExchangeKeys::from_env("BINANCE"),
            bybit_keys: ExchangeKeys::from_env("BYBIT"),
            okx_keys: ExchangeKeys::from_env("OKX"),
            bitget_keys: ExchangeKeys::from_env("BITGET"),
            bingx_keys: ExchangeKeys::from_env("BINGX"),
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "dev-secret-change-in-production".to_string()),
            cors_origins: env::var("CORS_ORIGINS")
                .unwrap_or_else(|_| "*".to_string())
                .split(',')
                .map(|s| s.to_string())
                .collect(),
        })
    }
}

impl ExchangeKeys {
    fn from_env(prefix: &str) -> Option<Self> {
        let api_key = env::var(format!("{}_API_KEY", prefix)).ok()?;
        let api_secret = env::var(format!("{}_API_SECRET", prefix)).ok()?;
        
        Some(Self { api_key, api_secret })
    }
}
