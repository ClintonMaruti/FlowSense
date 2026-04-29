import { 
  ApplianceType, 
  DiscreteAppliance, 
  ContinuousAppliance, 
  WaterAppliance 
} from './models';

export const createHousehold = (): WaterAppliance[] => {
  return [
    // Living Room Floor
    new DiscreteAppliance('lr-toilet', 'Guest Toilet', ApplianceType.TOILET, 6, 'Living Room Floor'),
    
    // Master Bedroom
    new ContinuousAppliance('mb-shower', 'Master Shower', ApplianceType.SHOWER, 9, 'Master Bedroom'),
    new DiscreteAppliance('mb-toilet', 'Master Toilet', ApplianceType.TOILET, 6, 'Master Bedroom'),
    new ContinuousAppliance('mb-faucet', 'Master Faucet', ApplianceType.FAUCET, 5, 'Master Bedroom'),
    
    // Upstairs Hallway
    new ContinuousAppliance('uh-shower', 'Hallway Shower', ApplianceType.SHOWER, 9, 'Upstairs Hallway'),
    new DiscreteAppliance('uh-toilet', 'Hallway Toilet', ApplianceType.TOILET, 6, 'Upstairs Hallway'),
    new ContinuousAppliance('uh-faucet', 'Hallway Faucet', ApplianceType.FAUCET, 5, 'Upstairs Hallway'),
    
    // Guest Room
    new ContinuousAppliance('gr-shower', 'Guest Shower', ApplianceType.SHOWER, 9, 'Guest Room'),
    new DiscreteAppliance('gr-toilet', 'Guest Toilet', ApplianceType.TOILET, 6, 'Guest Room'),
    new ContinuousAppliance('gr-faucet', 'Guest Faucet', ApplianceType.FAUCET, 5, 'Guest Room'),
    
    // Kitchen
    new ContinuousAppliance('k-faucet', 'Kitchen Faucet', ApplianceType.FAUCET, 7, 'Kitchen'),
    
    // Dining Room
    new ContinuousAppliance('dr-faucet', 'Dining Faucet', ApplianceType.FAUCET, 4, 'Dining Room'),
    
    // Laundry Room
    new ContinuousAppliance('l-wm', 'Washing Machine', ApplianceType.WASHING_MACHINE, 15, 'Laundry Room'),
    
    // Garden
    new ContinuousAppliance('g-hose', 'Garden Hose', ApplianceType.GARDEN_HOSE, 20, 'Outdoor Garden'),
  ];
};

export const UNIT_PRICE_KSH = 200; // 1 unit = 1000L = 200 Ksh
export const LITERS_PER_UNIT = 1000;

