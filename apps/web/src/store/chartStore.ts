"use client";

import { create } from "zustand";

interface ChartStore {
  chartData: any[];
  mainChart: any | null;
  setChartData: (data: any[]) => void;
  setMainChart: (chart: any) => void;
}

export const useChartStore = create<ChartStore>((set) => ({
  chartData: [],
  mainChart: null,
  setChartData: (data) => set({ chartData: data }),
  setMainChart: (chart) => set({ mainChart: chart }),
}));
