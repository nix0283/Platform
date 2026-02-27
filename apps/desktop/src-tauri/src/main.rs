// ============================================
// TAURI DESKTOP APP — Main Rust Backend
// ============================================

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri::{CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu};
use std::sync::Arc;
use tokio::sync::RwLock;

// ============================================
// TRADING STATE
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradingState {
    pub connected_exchanges: Vec<String>,
    pub active_positions: usize,
    pub total_pnl: f64,
    pub last_sync: u64,
}

impl Default for TradingState {
    fn default() -> Self {
        Self {
            connected_exchanges: vec![],
            active_positions: 0,
            total_pnl: 0.0,
            last_sync: 0,
        }
    }
}

pub type AppState = Arc<RwLock<TradingState>>;

// ============================================
// TRADING COMMANDS
// ============================================

#[tauri::command]
async fn get_trading_state(state: tauri::State<'_, AppState>) -> Result<TradingState, String> {
    let state = state.read().await;
    Ok(state.clone())
}

#[tauri::command]
async fn connect_exchange(
    state: tauri::State<'_, AppState>,
    exchange: String,
    api_key: String,
    api_secret: String,
) -> Result<(), String> {
    if api_key.is_empty() || api_secret.is_empty() {
        return Err("API keys cannot be empty".to_string());
    }

    let mut state = state.write().await;
    
    if !state.connected_exchanges.contains(&exchange) {
        state.connected_exchanges.push(exchange.clone());
    }
    
    state.last_sync = chrono::Utc::now().timestamp() as u64;
    println!("Connected to exchange: {}", exchange);

    Ok(())
}

#[tauri::command]
async fn disconnect_exchange(
    state: tauri::State<'_, AppState>,
    exchange: String,
) -> Result<(), String> {
    let mut state = state.write().await;
    state.connected_exchanges.retain(|e| e != &exchange);
    state.last_sync = chrono::Utc::now().timestamp() as u64;
    Ok(())
}

#[tauri::command]
async fn place_order(
    exchange: String,
    symbol: String,
    side: String,
    quantity: f64,
    price: Option<f64>,
) -> Result<OrderResult, String> {
    if quantity <= 0.0 {
        return Err("Quantity must be positive".to_string());
    }

    let order_id = uuid::Uuid::new_v4().to_string();
    
    Ok(OrderResult {
        order_id,
        exchange,
        symbol,
        side,
        quantity,
        price,
        status: "pending".to_string(),
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderResult {
    pub order_id: String,
    pub exchange: String,
    pub symbol: String,
    pub side: String,
    pub quantity: f64,
    pub price: Option<f64>,
    pub status: String,
}

#[tauri::command]
async fn cancel_order(exchange: String, order_id: String) -> Result<(), String> {
    println!("Cancelling order {} on {}", order_id, exchange);
    Ok(())
}

#[tauri::command]
async fn get_market_data(exchange: String, symbol: String) -> Result<MarketData, String> {
    Ok(MarketData {
        symbol,
        exchange,
        last_price: 0.0,
        bid: 0.0,
        ask: 0.0,
        volume_24h: 0.0,
        change_24h: 0.0,
        high_24h: 0.0,
        low_24h: 0.0,
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketData {
    pub symbol: String,
    pub exchange: String,
    pub last_price: f64,
    pub bid: f64,
    pub ask: f64,
    pub volume_24h: f64,
    pub change_24h: f64,
    pub high_24h: f64,
    pub low_24h: f64,
}

#[tauri::command]
async fn export_data(path: String, data_type: String, start_time: u64, end_time: u64) -> Result<String, String> {
    use std::fs::File;
    use std::io::Write;
    
    let mut file = File::create(&path).map_err(|e| format!("Failed to create file: {}", e))?;
    
    let content = format!("Trading Data Export\nType: {}\nFrom: {}\nTo: {}\n", data_type, start_time, end_time);
    
    file.write_all(content.as_bytes()).map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(path)
}

#[tauri::command]
async fn import_strategy(path: String) -> Result<String, String> {
    use std::fs;
    
    let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    
    if !content.contains("strategy(") && !content.contains("indicator(") {
        return Err("Invalid Pine Script: missing strategy or indicator declaration".to_string());
    }
    
    Ok(content)
}

// ============================================
// SYSTEM TRAY
// ============================================

fn create_system_tray() -> SystemTray {
    let menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("show", "Show"))
        .add_native_item(tauri::SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("refresh", "Refresh Data"))
        .add_item(CustomMenuItem::new("settings", "Settings"))
        .add_native_item(tauri::SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("quit", "Quit"));

    SystemTray::new().with_menu(menu)
}

fn handle_system_tray_event(app: &tauri::AppHandle, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
            "show" => {
                if let Some(window) = app.get_window("main") {
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
            }
            "refresh" => {
                app.emit_all("refresh-data", ()).unwrap();
            }
            "settings" => {
                if let Some(window) = app.get_window("main") {
                    window.emit("open-settings", ()).unwrap();
                }
            }
            "quit" => {
                std::process::exit(0);
            }
            _ => {}
        },
        SystemTrayEvent::DoubleClick { .. } => {
            if let Some(window) = app.get_window("main") {
                window.show().unwrap();
                window.set_focus().unwrap();
            }
        }
        _ => {}
    }
}

// ============================================
// MAIN
// ============================================

fn main() {
    tracing_subscriber::fmt::init();

    let app_state = AppState::default();

    tauri::Builder::default()
        .manage(app_state)
        .system_tray(create_system_tray())
        .on_system_tray_event(handle_system_tray_event)
        .invoke_handler(tauri::generate_handler![
            get_trading_state,
            connect_exchange,
            disconnect_exchange,
            place_order,
            cancel_order,
            get_market_data,
            export_data,
            import_strategy,
        ])
        .setup(|app| {
            if let Some(window) = app.get_window("main") {
                window.set_title("Trading Platform").unwrap();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
