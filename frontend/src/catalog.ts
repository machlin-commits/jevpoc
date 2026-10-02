import data from '../../shared/catalog.json';
export interface Tech {id:string;name:string;category:string;slug:string;hex:string;keywords:string[]}
export const catalog: Tech[] = data;
export const categories = [...new Set(catalog.map(t=>t.category))];
