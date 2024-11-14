import {Challenge} from './Challenge';

export type Dashboard = {
    motive: string | number | boolean | Date | null;
    randomTrendingChallenge: Challenge | null;
    similarInterestsCount: number;
}
