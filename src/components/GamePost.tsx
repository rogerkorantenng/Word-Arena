import { Devvit } from '@devvit/public-api';
import type { Context, JSONObject } from '@devvit/public-api';
import type { GameMode } from '../types/index.js';
import { MODES } from '../types/index.js';
import { getCompletedModes, markModeCompleted } from '../handlers/gameState.js';
import { getUserStats, recordScore, getLeaderboard } from '../handlers/leaderboard.js';

const WEBVIEW_ID = 'word-arena';

function reply(context: Context, data: Record<string, unknown>) {
  context.ui.webView.postMessage(WEBVIEW_ID, data as JSONObject);
}

export function GamePost(context: Context): JSX.Element {
  const handleMessage = async (msg: unknown) => {
    const message = msg as Record<string, unknown>;
    try {
      const userId = context.userId ?? 'anonymous';

      switch (message.type as string) {
        case 'get_daily_modes': {
          const completed = await getCompletedModes(context, userId);
          reply(context, {
            type: 'daily_modes',
            data: { modes: MODES, completed },
          });
          break;
        }

        case 'submit_score': {
          if (message.payload) {
            const payload = message.payload as { mode: GameMode; score: number; details: unknown; shareText: string };
            const user = await context.reddit.getCurrentUser();
            const username = user?.username ?? 'Anonymous';

            const result = await recordScore(context, userId, username, payload.mode, payload.score);
            await markModeCompleted(context, userId, payload.mode);

            reply(context, {
              type: 'score_saved',
              data: result,
            });
          } else {
            reply(context, {
              type: 'error',
              data: { message: 'No payload provided' },
            });
          }
          break;
        }

        case 'get_leaderboard': {
          if (message.payload) {
            const payload = message.payload as { mode: GameMode };
            const entries = await getLeaderboard(context, payload.mode);
            reply(context, {
              type: 'leaderboard',
              data: { entries },
            });
          } else {
            reply(context, {
              type: 'error',
              data: { message: 'No mode specified' },
            });
          }
          break;
        }

        case 'get_stats': {
          const stats = await getUserStats(context, userId);
          reply(context, {
            type: 'stats',
            data: stats,
          });
          break;
        }

        default:
          console.log('Unknown message type:', message);
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
      reply(context, {
        type: 'error',
        data: { message: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  };

  return (
    <vstack height="100%" width="100%" backgroundColor="#0f0f23">
      <webview
        id={WEBVIEW_ID}
        url="index.html"
        height="100%"
        width="100%"
        onMessage={handleMessage}
      />
    </vstack>
  );
}
