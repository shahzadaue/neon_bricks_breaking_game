/**
 * Leaderboard Service:
 * Real-time subscription and submission for the Global Top 10 Community High Scores.
 */

import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export interface LeaderboardEntry {
  id?: string;
  playerName: string;
  score: number;
  maxCombo: number;
  levelReached: number;
  bricksCleared: number;
  mode: 'SOLO' | 'VS_2P';
  createdAt?: any;
}

const LEADERBOARD_COLLECTION = 'leaderboard';
const LOCAL_PLAYER_NAME_KEY = 'neon_breakout_player_name';

export class LeaderboardService {
  /**
   * Subscribe to real-time top 10 high scores ordered by score descending
   */
  public static subscribeToTopScores(
    onUpdate: (scores: LeaderboardEntry[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const q = query(
      collection(db, LEADERBOARD_COLLECTION),
      orderBy('score', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const entries: LeaderboardEntry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          entries.push({
            id: docSnap.id,
            playerName: data.playerName || 'Anonymous',
            score: Number(data.score) || 0,
            maxCombo: Number(data.maxCombo) || 0,
            levelReached: Number(data.levelReached) || 1,
            bricksCleared: Number(data.bricksCleared) || 0,
            mode: data.mode === 'VS_2P' ? 'VS_2P' : 'SOLO',
            createdAt: data.createdAt,
          });
        });
        onUpdate(entries);
      },
      (error) => {
        console.error('Leaderboard subscription error:', error);
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.LIST, LEADERBOARD_COLLECTION);
      }
    );

    return unsubscribe;
  }

  /**
   * One-time fetch of top 10 scores
   */
  public static async fetchTopScores(): Promise<LeaderboardEntry[]> {
    try {
      const q = query(
        collection(db, LEADERBOARD_COLLECTION),
        orderBy('score', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const entries: LeaderboardEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        entries.push({
          id: docSnap.id,
          playerName: data.playerName || 'Anonymous',
          score: Number(data.score) || 0,
          maxCombo: Number(data.maxCombo) || 0,
          levelReached: Number(data.levelReached) || 1,
          bricksCleared: Number(data.bricksCleared) || 0,
          mode: data.mode === 'VS_2P' ? 'VS_2P' : 'SOLO',
          createdAt: data.createdAt,
        });
      });
      return entries;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, LEADERBOARD_COLLECTION);
    }
  }

  /**
   * Submit a new score to the global community leaderboard
   */
  public static async submitScore(entry: {
    playerName: string;
    score: number;
    maxCombo: number;
    levelReached: number;
    bricksCleared: number;
    mode: 'SOLO' | 'VS_2P';
  }): Promise<string> {
    const sanitizedName = (entry.playerName || 'NeonPilot')
      .trim()
      .slice(0, 20)
      .replace(/[^\w\s-]/g, '') || 'NeonPilot';

    // Save player name locally for future submissions
    try {
      localStorage.setItem(LOCAL_PLAYER_NAME_KEY, sanitizedName);
    } catch {}

    const payload = {
      playerName: sanitizedName,
      score: Math.max(0, Math.min(10000000, Math.floor(entry.score))),
      maxCombo: Math.max(0, Math.min(1000, Math.floor(entry.maxCombo))),
      levelReached: Math.max(1, Math.min(100, Math.floor(entry.levelReached))),
      bricksCleared: Math.max(0, Math.min(50000, Math.floor(entry.bricksCleared))),
      mode: entry.mode === 'VS_2P' ? 'VS_2P' : 'SOLO',
      createdAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, LEADERBOARD_COLLECTION), payload);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, LEADERBOARD_COLLECTION);
    }
  }

  /**
   * Get cached player name
   */
  public static getSavedPlayerName(): string {
    try {
      return localStorage.getItem(LOCAL_PLAYER_NAME_KEY) || '';
    } catch {
      return '';
    }
  }
}
