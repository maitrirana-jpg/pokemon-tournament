import { Routes } from '@angular/router';
import { HistoryPage } from './tournament/history-page/history-page';
import { RoundByRoundPage } from './tournament/round-by-round-page/round-by-round-page';
import { StatisticsPage } from './tournament/statistics-page/statistics-page';

export const routes: Routes = [
  { path: '', component: RoundByRoundPage },
  { path: 'tournament/:id', component: RoundByRoundPage },
  { path: 'history', component: HistoryPage },
  { path: 'classic', component: StatisticsPage },
];
