export const carMakesModels = {
  Toyota: ["Camry", "Corolla", "RAV4", "Highlander", "Land Cruiser", "Hilux", "Prado", "Yaris", "Fortuner","Tacoma","Tundra","Sequoia"],
  Nissan: ["Altima", "Patrol", "Patrol Super Safari", "Sentra", "Pathfinder","Pickup","Frontier","Rogue","v-tec","Armada","NV3500"],
  Honda: ["Accord", "Civic", "CR-V", "Pilot"],
  BMW: ["3 Series", "5 Series", "X3", "X5"],
  "Mercedes-Benz": ["C-Class", "E-Class", "GLE", "GLS"],
  Ford: ["F-150", "Mustang", "Explorer","Raptor","Bronco"],
  Chevrolet: ["Silverado", "Equinox", "Malibu"],
  Volkswagen: ["Golf", "Passat", "Tiguan"],
  Audi: ["A4", "A6", "Q5", "Q7"],
  Hyundai: ["Elantra", "Santa Fe", "Tucson"],
  Kia: ["Sorento", "Sportage", "Optima"],
  Mazda: ["Mazda3", "CX-5", "CX-9","Mazda6","Mazda2"],
  Subaru: ["Impreza", "Forester", "Outback"],
  Tesla: ["Model S", "Model 3", "Model X", "Model Y"],
  GMC: ["Sierra", "Yukon", "Acadia"],
  Lexus: ["ES", "RX", "LX", "GX", "NX", "IS" ],
  Jeep: ["Wrangler", "Grand Cherokee", "Cherokee"],
  Dodge: ["Ram", "Charger", "Durango"],
} as const;

export type CarMake = keyof typeof carMakesModels;


export const carColors = [
  "White", "Black", "Silver", "Gray", "Red", "Blue", "Green"
];

export const carYears = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);
