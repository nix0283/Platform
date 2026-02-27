// ============================================
// WEBSOCKET HANDLER
// Обработка WebSocket соединений
// ============================================

use actix::prelude::*;
use actix_web::{web, Error, HttpRequest, HttpResponse};
use actix_web_actors::ws;
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use uuid::Uuid;

use crate::cache::Cache;
use crate::config::Config;
use crate::exchanges::ExchangeManager;

/// Как часто отправлять ping для проверки соединения
const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);
/// Таймаут ожидания pong
const CLIENT_TIMEOUT: Duration = Duration::from_secs(30);

/// Сообщения от клиента
#[derive(Debug, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum ClientMessage {
    /// Подписка на свечи
    #[serde(rename = "subscribe_candles")]
    SubscribeCandles {
        exchange: String,
        symbol: String,
        interval: String,
    },
    /// Отписка от свечей
    #[serde(rename = "unsubscribe_candles")]
    UnsubscribeCandles {
        exchange: String,
        symbol: String,
        interval: String,
    },
    /// Подписка на стакан
    #[serde(rename = "subscribe_orderbook")]
    SubscribeOrderbook {
        exchange: String,
        symbol: String,
    },
    /// Запрос исторических данных
    #[serde(rename = "get_candles")]
    GetCandles {
        exchange: String,
        symbol: String,
        interval: String,
        limit: u32,
    },
    /// Выставить ордер
    #[serde(rename = "place_order")]
    PlaceOrder {
        exchange: String,
        symbol: String,
        side: String,
        order_type: String,
        quantity: f64,
        price: Option<f64>,
    },
    /// Ping для проверки соединения
    #[serde(rename = "ping")]
    Ping,
}

/// Сообщения клиенту
#[derive(Debug, Serialize, Clone)]
#[serde(tag = "type")]
pub enum ServerMessage {
    /// Данные свечи
    #[serde(rename = "candle")]
    Candle {
        exchange: String,
        symbol: String,
        interval: String,
        timestamp: u64,
        open: f64,
        high: f64,
        low: f64,
        close: f64,
        volume: f64,
    },
    /// Данные стакана
    #[serde(rename = "orderbook")]
    Orderbook {
        exchange: String,
        symbol: String,
        bids: Vec<(f64, f64)>,
        asks: Vec<(f64, f64)>,
        timestamp: u64,
    },
    /// Исторические свечи
    #[serde(rename = "candles_history")]
    CandlesHistory {
        exchange: String,
        symbol: String,
        interval: String,
        candles: Vec<CandleData>,
    },
    /// Статус ордера
    #[serde(rename = "order_status")]
    OrderStatus {
        order_id: String,
        status: String,
        filled_qty: f64,
        avg_price: f64,
    },
    /// Ошибка
    #[serde(rename = "error")]
    Error {
        code: String,
        message: String,
    },
    /// Pong ответ
    #[serde(rename = "pong")]
    Pong,
    /// Подтверждение подписки
    #[serde(rename = "subscribed")]
    Subscribed {
        subscription: String,
    },
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CandleData {
    pub timestamp: u64,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: f64,
}

/// WebSocket сессия
pub struct WsSession {
    id: Uuid,
    hb: Instant,
    subscriptions: Vec<String>,
    exchange_manager: web::Data<ExchangeManager>,
    cache: web::Data<Cache>,
    config: web::Data<Config>,
}

impl WsSession {
    pub fn new(
        exchange_manager: web::Data<ExchangeManager>,
        cache: web::Data<Cache>,
        config: web::Data<Config>,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            hb: Instant::now(),
            subscriptions: Vec::new(),
            exchange_manager,
            cache,
            config,
        }
    }

    /// Отправка heartbeat
    fn hb(&self, ctx: &mut <Self as Actor>::Context) {
        ctx.run_interval(HEARTBEAT_INTERVAL, |act, ctx| {
            if Instant::now().duration_since(act.hb) > CLIENT_TIMEOUT {
                ctx.stop();
                return;
            }
            ctx.ping(b"");
        });
    }

    /// Обработка сообщения от клиента
    fn handle_message(
        &mut self,
        msg: ClientMessage,
        ctx: &mut ws::WebsocketContext<Self>,
    ) {
        match msg {
            ClientMessage::SubscribeCandles {
                exchange,
                symbol,
                interval,
            } => {
                let subscription = format!("candles:{}:{}:{}", exchange, symbol, interval);
                self.subscriptions.push(subscription.clone());
                
                // Отправляем подтверждение
                let response = ServerMessage::Subscribed { subscription };
                ctx.text(serde_json::to_string(&response).unwrap());

                // TODO: Подписаться на реальный стрим биржи
            }
            ClientMessage::UnsubscribeCandles {
                exchange,
                symbol,
                interval,
            } => {
                let subscription = format!("candles:{}:{}:{}", exchange, symbol, interval);
                self.subscriptions.retain(|s| s != &subscription);
            }
            ClientMessage::GetCandles {
                exchange,
                symbol,
                interval,
                limit,
            } => {
                // Запрос к кэшу или бирже
                ctx.spawn(self.get_candles(exchange, symbol, interval, limit, ctx));
            }
            ClientMessage::PlaceOrder {
                exchange,
                symbol,
                side,
                order_type,
                quantity,
                price,
            } => {
                ctx.spawn(self.place_order(exchange, symbol, side, order_type, quantity, price, ctx));
            }
            ClientMessage::Ping => {
                let response = ServerMessage::Pong;
                ctx.text(serde_json::to_string(&response).unwrap());
            }
            ClientMessage::SubscribeOrderbook { exchange, symbol } => {
                let subscription = format!("orderbook:{}:{}", exchange, symbol);
                self.subscriptions.push(subscription.clone());
                
                let response = ServerMessage::Subscribed { subscription };
                ctx.text(serde_json::to_string(&response).unwrap());
            }
        }
    }

    async fn get_candles(
        &self,
        exchange: String,
        symbol: String,
        interval: String,
        limit: u32,
        ctx: &mut ws::WebsocketContext<Self>,
    ) {
        // Проверка кэша
        let cache_key = format!("candles:{}:{}:{}:{}", exchange, symbol, interval, limit);
        
        if let Ok(Some(cached)) = self.cache.get(&cache_key).await {
            let response: ServerMessage = serde_json::from_str(&cached).unwrap();
            ctx.text(serde_json::to_string(&response).unwrap());
            return;
        }

        // Запрос к бирже
        match self.exchange_manager.get_candles(&exchange, &symbol, &interval, limit).await {
            Ok(candles) => {
                let response = ServerMessage::CandlesHistory {
                    exchange,
                    symbol,
                    interval,
                    candles: candles
                        .into_iter()
                        .map(|c| CandleData {
                            timestamp: c.timestamp,
                            open: c.open,
                            high: c.high,
                            low: c.low,
                            close: c.close,
                            volume: c.volume,
                        })
                        .collect(),
                };
                ctx.text(serde_json::to_string(&response).unwrap());

                // Кэширование
                let _ = self
                    .cache
                    .set(&cache_key, &serde_json::to_string(&response).unwrap(), 60)
                    .await;
            }
            Err(e) => {
                let response = ServerMessage::Error {
                    code: "CANDLES_ERROR".to_string(),
                    message: e.to_string(),
                };
                ctx.text(serde_json::to_string(&response).unwrap());
            }
        }
    }

    async fn place_order(
        &self,
        exchange: String,
        symbol: String,
        side: String,
        order_type: String,
        quantity: f64,
        price: Option<f64>,
        ctx: &mut ws::WebsocketContext<Self>,
    ) {
        match self
            .exchange_manager
            .place_order(&exchange, &symbol, &side, &order_type, quantity, price)
            .await
        {
            Ok(order) => {
                let response = ServerMessage::OrderStatus {
                    order_id: order.id,
                    status: order.status,
                    filled_qty: order.filled_qty,
                    avg_price: order.avg_price,
                };
                ctx.text(serde_json::to_string(&response).unwrap());
            }
            Err(e) => {
                let response = ServerMessage::Error {
                    code: "ORDER_ERROR".to_string(),
                    message: e.to_string(),
                };
                ctx.text(serde_json::to_string(&response).unwrap());
            }
        }
    }
}

impl Actor for WsSession {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        self.hb(ctx);
        tracing::info!("WebSocket session started: {}", self.id);
    }

    fn stopped(&mut self, _ctx: &mut Self::Context) {
        tracing::info!("WebSocket session stopped: {}", self.id);
    }
}

impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WsSession {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match msg {
            ws::Message::Ping(msg) => {
                self.hb = Instant::now();
                ctx.pong(&msg);
            }
            ws::Message::Pong(_) => {
                self.hb = Instant::now();
            }
            ws::Message::Text(text) => {
                match serde_json::from_str::<ClientMessage>(&text) {
                    Ok(msg) => self.handle_message(msg, ctx),
                    Err(e) => {
                        let response = ServerMessage::Error {
                            code: "PARSE_ERROR".to_string(),
                            message: format!("Invalid JSON: {}", e),
                        };
                        ctx.text(serde_json::to_string(&response).unwrap());
                    }
                }
            }
            ws::Message::Binary(bin) => ctx.binary(bin),
            ws::Message::Close(reason) => {
                ctx.close(reason);
                ctx.stop();
            }
            _ => (),
        }
    }
}

/// HTTP endpoint для WebSocket upgrade
pub async fn ws_handler(
    req: HttpRequest,
    stream: web::Payload,
    exchange_manager: web::Data<ExchangeManager>,
    cache: web::Data<Cache>,
    config: web::Data<Config>,
) -> Result<HttpResponse, Error> {
    let session = WsSession::new(exchange_manager, cache, config);
    
    ws::start(session, &req, stream)
}
