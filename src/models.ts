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

  setLeak(isLeaking: boolean, rate?: number) {
    this.isLeaking = isLeaking;
    if (isLeaking) {
      this.leakRate = rate || this.calculateBaseLeakRate();
    } else {
      this.leakRate = 0;
    }
  }

  protected calculateBaseLeakRate(): number {
    // Default base rates in Liters per hour
    switch (this.type) {
      case ApplianceType.TOILET: return 5 + (Math.random() * 10); // Faulty flapper
      case ApplianceType.FAUCET: return 0.5 + (Math.random() * 2); // Constant drip
      case ApplianceType.SHOWER: return 1.5 + (Math.random() * 3); // Leaking valve
      case ApplianceType.GARDEN_HOSE: return 10 + (Math.random() * 20); // Pin hole or burst
      default: return 1.0;
    }
  }

  getLeakUsage(durationHours: number): number {
    if (!this.isLeaking) return 0;
    // Add some variance to the leak rate
    const variance = (Math.random() - 0.5) * 0.1 * this.leakRate;
    return (this.leakRate + variance) * durationHours;
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

