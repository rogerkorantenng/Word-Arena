import { Devvit } from '@devvit/public-api';
import { GamePost } from './components/GamePost.js';

Devvit.configure({
  redditAPI: true,
  redis: true,
});

Devvit.addMenuItem({
  label: 'Create Word Arena',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    const subreddit = await reddit.getCurrentSubreddit();

    const post = await reddit.submitPost({
      title: 'Word Arena - Daily Word Challenge',
      subredditName: subreddit.name,
      textFallback: {
        text: 'Word Arena - Play 4 daily word game modes! Open this post in the Reddit app or new Reddit to play.',
      },
      preview: (
        <vstack height="100%" width="100%" alignment="middle center" backgroundColor="#0f0f23">
          <text color="white" size="xlarge" weight="bold">Loading Word Arena...</text>
          <spacer size="medium" />
          <text color="#888888" size="medium">Preparing today's challenges</text>
        </vstack>
      ),
    });

    ui.showToast({ text: 'Word Arena post created!' });
    ui.navigateTo(post);
  },
});

Devvit.addCustomPostType({
  name: 'Word Arena',
  height: 'tall',
  render: (context) => {
    return GamePost(context);
  },
});

export default Devvit;
