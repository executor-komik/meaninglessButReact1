import type { FC, ReactElement } from 'react';

import { DelayedMessageDemo } from './lessons/lesson-01b/DelayedMessageDemo';
import { OpenMeteoDemo } from './lessons/lesson-05-fetch/OpenMeteoDemo';

export const App: FC = (): ReactElement => (
  <main className="playground">
    <h1>Promise lessons</h1>
    <p className="hint">Lessons 1–6: promises, async/await, fetch, and geocoding.</p>
    <DelayedMessageDemo />
    <OpenMeteoDemo />
  </main>
);
