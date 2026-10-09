import { Routes } from '@angular/router';
import { RoundByRoundPage } from './tournament/round-by-round-page/round-by-round-page';
import { StatisticsPage } from './tournament/statistics-page/statistics-page';

export const routes: Routes = [
  { path: '', component: RoundByRoundPage },
  { path: 'classic', component: StatisticsPage },
];
