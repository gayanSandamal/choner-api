import {Challenge} from './Challenge';

export type Dashboard = {
    motive: string | null;
    randomTrendingChallenge: Challenge | null;
    similarInterestsCount: number;
}
