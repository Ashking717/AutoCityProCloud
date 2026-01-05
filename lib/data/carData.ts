export const carMakesModels = {
  Toyota: ["Camry", "Corolla", "RAV4", "Highlander", "Land Cruiser", "Hilux", "Prado"],
  Nissan: ["Altima", "Patrol", "Patrol Super Safari", "Sentra", "Pathfinder"],
  Honda: ["Accord", "Civic", "CR-V", "Pilot"],
  BMW: ["3 Series", "5 Series", "X3", "X5"],
  "Mercedes-Benz": ["C-Class", "E-Class", "GLE", "GLS"],
  Ford: ["F-150", "Mustang", "Explorer"],
  Lexus: ["ES", "RX", "LX"],
} as const;

export type CarMake = keyof typeof carMakesModels;


export const carColors = [
  "White", "Black", "Silver", "Gray", "Red", "Blue", "Green"
];

export const carYears = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);
