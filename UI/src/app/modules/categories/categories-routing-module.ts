import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CategoriesList } from './components/categories-list/categories-list';
import {CategoriesForm} from './components/categories-form/categories-form';
const routes: Routes = [{
  path: '',
  component: CategoriesList
},
{
  path: 'add',
  component: CategoriesForm
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CategoriesRoutingModule { }
