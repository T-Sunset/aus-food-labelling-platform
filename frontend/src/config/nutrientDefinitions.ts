export interface NutrientDefinition {
  id: string;
  label: string;
  unit: string;
  parent: string | null;
  order: number;
  mandatoryBase: boolean;
  claimTriggers: string[];
  displayRules: Record<string, any>;
}

export const nutrientDefinitions: NutrientDefinition[] = [
  { id:"energy", label:"Energy", unit:"kj", parent:null, order:1, mandatoryBase:true, claimTriggers:[], displayRules:{lessThan:0.1, lessThanLabel:"<0.1"} },
  { id:"protein", label:"Protein", unit:"g", parent:null, order:2, mandatoryBase:true, claimTriggers:[], displayRules:{} },
  { id:"fat", label:"Fat, total", unit:"g", parent:null, order:3, mandatoryBase:true, claimTriggers:["lowFat"], displayRules:{} },
  { id:"saturatedFat", label:"— Saturated", unit:"g", parent:"fat", order:4, mandatoryBase:true, claimTriggers:["lowFat"], displayRules:{} },
  { id:"transFat", label:"— Trans", unit:"g", parent:"fat", order:5, mandatoryBase:false, claimTriggers:["lowFat"], displayRules:{} },
  { id:"carbohydrate", label:"Carbohydrate", unit:"g", parent:null, order:6, mandatoryBase:true, claimTriggers:["lowCarb"], displayRules:{} },
  { id:"sugars", label:"— Sugars", unit:"g", parent:"carbohydrate", order:7, mandatoryBase:true, claimTriggers:["lowSugar"], displayRules:{} },
  { id:"sodium", label:"Sodium", unit:"mg", parent:null, order:8, mandatoryBase:true, claimTriggers:["lowSodium"], displayRules:{} }
];

export const dailyIntakeReference: Record<string, number> = {
  energy: 8700,
  protein: 50,
  fat: 70,
  saturatedFat: 24,
  carbohydrate: 310,
  sugars: 90,
  sodium: 2300
};