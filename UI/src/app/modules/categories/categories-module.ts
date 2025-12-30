import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CategoriesRoutingModule } from './categories-routing-module';
import { CategoriesList } from './components/categories-list/categories-list';
import { CategoriesForm } from './components/categories-form/categories-form';
import { CategoryCard } from './components/category-card/category-card';
import { CategoryListItem } from './components/category-list-item/category-list-item';
import { CategoryPanelItem } from './components/category-panel-item/category-panel-item';
import { CategoryFilters } from './components/category-filters/category-filters';
import { CategoryDetailModal } from './components/category-detail-modal/category-detail-modal';
import { CategoryQuickEditModal } from './components/category-quick-edit-modal/category-quick-edit-modal';


@NgModule({
  declarations: [
    // CategoriesList,
    // CategoriesForm
  
    // CategoryCard,
    // CategoryListItem,
    // CategoryPanelItem,
    // CategoryFilters,
    // CategoryDetailModal,
    // CategoryQuickEditModal
  ],
  imports: [
    CommonModule,
    CategoriesRoutingModule,
    // CategoriesList,
    // CategoriesForm
  ]
})
export class CategoriesModule { }
