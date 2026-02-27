'use client';

// ============================================
// MOBILE PAPER TRADING PANEL
// Компактная панель для мобильного приложения
// ============================================

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { usePaperTrading } from '@trading-platform/paper-trading';

interface PaperTradingPanelProps {
  compact?: boolean;
}

export const PaperTradingPanel: React.FC<PaperTradingPanelProps> = ({
  compact = false,
}) => {
  const {
    ready,
    mode,
    stats,
    positions,
    orders,
    placeOrder,
    closePosition,
    resetAccount,
  } = usePaperTrading();

  const [activeTab, setActiveTab] = useState<'positions' | 'stats'>('positions');

  if (!ready) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactLabel}>📄 Paper</Text>
        {stats && (
          <Text style={styles.compactValue}>
            ${stats.currentBalance.toFixed(0)} | {stats.winRate.toFixed(1)}%
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📄 Paper Trading</Text>
        <TouchableOpacity onPress={() => resetAccount()} style={styles.resetButton}>
          <Text style={styles.resetText}>🔄 Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      {stats && (
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>${stats.currentBalance.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Balance</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: stats.totalPnl >= 0 ? '#26a69a' : '#ef5350' }]}>
              ${stats.totalPnl.toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>PnL</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: stats.winRate >= 50 ? '#26a69a' : '#ef5350' }]}>
              {stats.winRate.toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalTrades}</Text>
            <Text style={styles.statLabel}>Trades</Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          onPress={() => setActiveTab('positions')}
          style={[styles.tab, activeTab === 'positions' && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === 'positions' && styles.activeTabText]}>
            Positions ({positions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('stats')}
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
            Statistics
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'positions' && (
          <View style={styles.positionsList}>
            {positions.length === 0 ? (
              <Text style={styles.emptyText}>No open positions</Text>
            ) : (
              positions.map((pos) => (
                <View key={pos.id} style={styles.positionCard}>
                  <View style={styles.positionHeader}>
                    <View style={styles.positionInfo}>
                      <Text style={[styles.sideBadge, { backgroundColor: pos.side === 'LONG' ? '#26a69a20' : '#ef535020', color: pos.side === 'LONG' ? '#26a69a' : '#ef5350' }]}>
                        {pos.side}
                      </Text>
                      <Text style={styles.symbol}>{pos.symbol}</Text>
                      <Text style={styles.leverage}>{pos.leverage}x</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => closePosition(pos.symbol, pos.side)}
                      style={styles.closeButton}
                    >
                      <Text style={styles.closeText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.positionDetails}>
                    <Text style={styles.detailText}>Qty: {pos.quantity.toFixed(4)}</Text>
                    <Text style={styles.detailText}>Entry: ${pos.entryPrice.toFixed(2)}</Text>
                    <Text style={styles.detailText}>Mark: ${pos.currentPrice.toFixed(2)}</Text>
                  </View>
                  <Text style={[styles.pnlText, { color: pos.unrealizedPnl >= 0 ? '#26a69a' : '#ef5350' }]}>
                    {pos.unrealizedPnl >= 0 ? '+' : ''}${pos.unrealizedPnl.toFixed(2)} ({pos.unrealizedPnlPercent.toFixed(2)}%)
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'stats' && stats && (
          <View style={styles.statsList}>
            <View style={styles.statRow}>
              <Text style={styles.statRowLabel}>Initial Balance</Text>
              <Text style={styles.statRowValue}>${stats.initialBalance.toFixed(0)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statRowLabel}>Current Balance</Text>
              <Text style={styles.statRowValue}>${stats.currentBalance.toFixed(0)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statRowLabel}>Total PnL</Text>
              <Text style={[styles.statRowValue, { color: stats.totalPnl >= 0 ? '#26a69a' : '#ef5350' }]}>
                ${stats.totalPnl.toFixed(0)}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statRowLabel}>PnL %</Text>
              <Text style={[styles.statRowValue, { color: stats.totalPnlPercent >= 0 ? '#26a69a' : '#ef5350' }]}>
                {stats.totalPnlPercent.toFixed(2)}%
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statRowLabel}>Winning Trades</Text>
              <Text style={[styles.statRowValue, { color: '#26a69a' }]}>{stats.winningTrades}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statRowLabel}>Losing Trades</Text>
              <Text style={[styles.statRowValue, { color: '#ef5350' }]}>{stats.losingTrades}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick Order */}
      <View style={styles.quickOrder}>
        <Text style={styles.quickOrderLabel}>Quick Paper Order</Text>
        <View style={styles.orderButtons}>
          <TouchableOpacity style={[styles.orderButton, styles.buyButton]}>
            <Text style={styles.orderButtonText}>BUY / LONG</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.orderButton, styles.sellButton]}>
            <Text style={styles.orderButtonText}>SELL / SHORT</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e222d',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#1e222d',
    borderTopWidth: 1,
    borderTopColor: '#242832',
  },
  compactLabel: {
    color: '#787b86',
    fontSize: 12,
  },
  compactValue: {
    color: '#d1d4dc',
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#242832',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d1d4dc',
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2a2e39',
    borderRadius: 6,
  },
  resetText: {
    color: '#d1d4dc',
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#2a2e39',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d1d4dc',
  },
  statLabel: {
    fontSize: 10,
    color: '#787b86',
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#242832',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2962ff',
  },
  tabText: {
    fontSize: 12,
    color: '#787b86',
  },
  activeTabText: {
    color: '#2962ff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  positionsList: {
    gap: 8,
  },
  emptyText: {
    color: '#787b86',
    textAlign: 'center',
    marginTop: 40,
  },
  positionCard: {
    backgroundColor: '#2a2e39',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#363c4e',
  },
  positionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  positionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sideBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
  },
  symbol: {
    color: '#d1d4dc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  leverage: {
    color: '#787b86',
    fontSize: 12,
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ef5350',
    borderRadius: 6,
  },
  closeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  positionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailText: {
    color: '#787b86',
    fontSize: 12,
  },
  pnlText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  statsList: {
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#242832',
  },
  statRowLabel: {
    color: '#787b86',
    fontSize: 14,
  },
  statRowValue: {
    color: '#d1d4dc',
    fontSize: 14,
    fontWeight: '600',
  },
  quickOrder: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#242832',
  },
  quickOrderLabel: {
    color: '#787b86',
    fontSize: 12,
    marginBottom: 8,
  },
  orderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  orderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  buyButton: {
    backgroundColor: '#26a69a',
  },
  sellButton: {
    backgroundColor: '#ef5350',
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default PaperTradingPanel;
