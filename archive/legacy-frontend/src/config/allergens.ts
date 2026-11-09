export interface Allergen {
  id: string;
  label: string;
  boldOnLabel: boolean;
  mandatory: boolean;
}

export const allergens: Allergen[] = [
  { id:"peanuts", label:"Peanuts", boldOnLabel:false, mandatory:true },
  { id:"treeNuts", label:"Tree Nuts", boldOnLabel:true, mandatory:true },
  { id:"milk", label:"Milk", boldOnLabel:true, mandatory:true },
  { id:"eggs", label:"Eggs", boldOnLabel:true, mandatory:true },
  { id:"soy", label:"Soy", boldOnLabel:true, mandatory:true },
  { id:"wheat", label:"Wheat", boldOnLabel:true, mandatory:true },
  { id:"fish", label:"Fish", boldOnLabel:true, mandatory:true },
  { id:"shellfish", label:"Shellfish", boldOnLabel:true, mandatory:true }
];