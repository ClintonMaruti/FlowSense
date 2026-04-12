/**
 * OOP Models for FlowSense Simulation
 */

export enum ApplianceType {
  TOILET = 'Toilet',
  SHOWER = 'Shower',
  FAUCET = 'Faucet',
  WASHING_MACHINE = 'Washing Machine',
  GARDEN_HOSE = 'Garden Hose',
}

export abstract class WaterAppliance {
  id: string;
  name: string;
  type: ApplianceType;
  flowRate: number; // Liters per minute
  location: string;
  isLeaking: boolean = false;
  leakRate: number = 0; // Liters per minute if leaking

  constructor(id: string, name: string, type: ApplianceType, flowRate: number, location: string) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.flowRate = flowRate;
    this.location = location;
  }

  abstract use(durationMinutes: number): number;

  setLeak(isLeaking: boolean, rate: number = 0.1) {
    this.isLeaking = isLeaking;
    this.leakRate = isLeaking ? rate : 0;
  }

  getLeakUsage(durationMinutes: number): number {
    return this.isLeaking ? this.leakRate * durationMinutes : 0;
  }
}

export class DiscreteAppliance extends WaterAppliance {
  // For things like toilets that have a fixed flush volume
  flushVolume: number;

  constructor(id: string, name: string, type: ApplianceType, flushVolume: number, location: string) {
    super(id, name, type, 0, location);
    this.flushVolume = flushVolume;
  }

  use(): number {
    return this.flushVolume;
  }
}

export class ContinuousAppliance extends WaterAppliance {
  constructor(id: string, name: string, type: ApplianceType, flowRate: number, location: string) {
    super(id, name, type, flowRate, location);
  }

  use(durationMinutes: number): number {
    return this.flowRate * durationMinutes;
  }
}

export interface UsageRecord {
  timestamp: Date;
  applianceId: string;
  applianceName: string;
  amount: number; // Liters
  isLeak: boolean;
}

export class WaterSensor {
  id: string;
  threshold: number; // Sensitivity for leak detection

  constructor(id: string, threshold: number = 0.05) {
    this.id = id;
    this.threshold = threshold;
  }

  analyzeFlow(flowData: number[]): boolean {
    // Simple logic: if flow is continuous and low for a long period, it's a leak
    const nonZeroFlows = flowData.filter(f => f > 0);
    if (nonZeroFlows.length === flowData.length && Math.min(...nonZeroFlows) < 0.5) {
      return true; // Likely a leak
    }
    return false;
  }
}
