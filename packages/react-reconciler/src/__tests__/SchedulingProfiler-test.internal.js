/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

'use strict';

function normalizeCodeLocInfo(str) {
  return (
    str &&
    str.replace(/\n +(?:at|in) ([\S]+)[^\n]*/g, function(m, name) {
      return '\n    in ' + name + ' (at **)';
    })
  );
}

describe('SchedulingProfiler', () => {
  let React;
  let ReactTestRenderer;
  let ReactNoop;
  let Scheduler;

  let marks;

  function createUserTimingPolyfill() {
    // This is not a true polyfill, but it gives us enough to capture marks.
    // Reference: https://developer.mozilla.org/en-US/docs/Web/API/User_Timing_API
    return {
      mark(markName) {
        marks.push(markName);
      },
    };
  }

  beforeEach(() => {
    jest.resetModules();
    global.performance = createUserTimingPolyfill();

    React = require('react');

    // ReactNoop must be imported after ReactTestRenderer!
    ReactTestRenderer = require('react-test-renderer');
    ReactNoop = require('react-noop-renderer');

    Scheduler = require('scheduler');

    marks = [];
  });

  afterEach(() => {
    delete global.performance;
  });

  // @gate !enableSchedulingProfiler
  it('should not mark if enableSchedulingProfiler is false', () => {
    ReactTestRenderer.create(<div />);
    expect(marks).toEqual([]);
  });

  // @gate enableSchedulingProfiler
  it('should mark sync render without suspends or state updates', () => {
    ReactTestRenderer.create(<div />);

    expect(marks).toEqual([
      '--schedule-render-1',
      '--render-start-1',
      '--render-stop',
      '--commit-start-1',
      '--layout-effects-start-1',
      '--layout-effects-stop',
      '--commit-stop',
    ]);
  });

  // @gate enableSchedulingProfiler
  it('should mark concurrent render without suspends or state updates', () => {
    ReactTestRenderer.create(<div />, {unstable_isConcurrent: true});

    expect(marks).toEqual(['--schedule-render-512']);

    marks.splice(0);

    expect(Scheduler).toFlushUntilNextPaint([]);

    expect(marks).toEqual([
      '--render-start-512',
      '--render-stop',
      '--commit-start-512',
      '--layout-effects-start-512',
      '--layout-effects-stop',
      '--commit-stop',
    ]);
  });

  // @gate enableSchedulingProfiler
  it('should mark render yields', async () => {
    function Bar() {
      Scheduler.unstable_yieldValue('Bar');
      return null;
    }

    function Foo() {
      Scheduler.unstable_yieldValue('Foo');
      return <Bar />;
    }

    ReactNoop.render(<Foo />);
    // Do one step of work.
    expect(ReactNoop.flushNextYield()).toEqual(['Foo']);

    expect(marks).toEqual([
      '--schedule-render-512',
      '--render-start-512',
      '--render-yield',
    ]);
  });

  // @gate enableSchedulingProfiler
  it('should mark sync render with suspense that resolves', async () => {
    const fakeSuspensePromise = Promise.resolve(true);
    function Example() {
      throw fakeSuspensePromise;
    }

    ReactTestRenderer.create(
      <React.Suspense fallback={null}>
        <Example />
      </React.Suspense>,
    );

    expect(marks).toEqual([
      '--schedule-render-1',
      '--render-start-1',
      '--suspense-suspend-0-Example-\n    at Example\n    at Suspense',
      '--render-stop',
      '--commit-start-1',
      '--layout-effects-start-1',
      '--layout-effects-stop',
      '--commit-stop',
    ]);

    marks.splice(0);

    await fakeSuspensePromise;
    expect(marks).toEqual([
      '--suspense-resolved-0-Example-\n    at Example\n    at Suspense',
    ]);
  });

  // @gate enableSchedulingProfiler
  it('should mark sync render with suspense that rejects', async () => {
    const fakeSuspensePromise = Promise.reject(new Error('error'));
    function Example() {
      throw fakeSuspensePromise;
    }

    ReactTestRenderer.create(
      <React.Suspense fallback={null}>
        <Example />
      </React.Suspense>,
    );

    expect(marks).toEqual([
      '--schedule-render-1',
      '--render-start-1',
      '--suspense-suspend-0-Example-\n    at Example\n    at Suspense',
      '--render-stop',
      '--commit-start-1',
      '--layout-effects-start-1',
      '--layout-effects-stop',
      '--commit-stop',
    ]);

    marks.splice(0);

    await expect(fakeSuspensePromise).rejects.toThrow();
    expect(marks).toEqual([
      '--suspense-rejected-0-Example-\n    at Example\n    at Suspense',
    ]);
  });

  // @gate enableSchedulingProfiler
  it('should mark concurrent render with suspense that resolves', async () => {
    const fakeSuspensePromise = Promise.resolve(true);
    function Example() {
      throw fakeSuspensePromise;
    }

    ReactTestRenderer.create(
      <React.Suspense fallback={null}>
        <Example />
      </React.Suspense>,
      {unstable_isConcurrent: true},
    );

    expect(marks).toEqual(['--schedule-render-512']);

    marks.splice(0);

    expect(Scheduler).toFlushUntilNextPaint([]);

    expect(marks).toEqual([
      '--render-start-512',
      '--suspense-suspend-0-Example-\n    at Example\n    at Suspense',
      '--render-stop',
      '--commit-start-512',
      '--layout-effects-start-512',
      '--layout-effects-stop',
      '--commit-stop',
    ]);

    marks.splice(0);

    await fakeSuspensePromise;
    expect(marks).toEqual([
      '--suspense-resolved-0-Example-\n    at Example\n    at Suspense',
    ]);
  });

  // @gate enableSchedulingProfiler
  it('should mark concurrent render with suspense that rejects', async () => {
    const fakeSuspensePromise = Promise.reject(new Error('error'));
    function Example() {
      throw fakeSuspensePromise;
    }

    ReactTestRenderer.create(
      <React.Suspense fallback={null}>
        <Example />
      </React.Suspense>,
      {unstable_isConcurrent: true},
    );

    expect(marks).toEqual(['--schedule-render-512']);

    marks.splice(0);

    expect(Scheduler).toFlushUntilNextPaint([]);

    expect(marks).toEqual([
      '--render-start-512',
      '--suspense-suspend-0-Example-\n    at Example\n    at Suspense',
      '--render-stop',
      '--commit-start-512',
      '--layout-effects-start-512',
      '--layout-effects-stop',
      '--commit-stop',
    ]);

    marks.splice(0);

    await expect(fakeSuspensePromise).rejects.toThrow();
    expect(marks).toEqual([
      '--suspense-rejected-0-Example-\n    at Example\n    at Suspense',
    ]);
  });

  // @gate enableSchedulingProfiler
  it('should mark cascading class component state updates', () => {
    class Example extends React.Component {
      state = {didMount: false};
      componentDidMount() {
        this.setState({didMount: true});
      }
      render() {
        return null;
      }
    }

    ReactTestRenderer.create(<Example />, {unstable_isConcurrent: true});

    expect(marks).toEqual(['--schedule-render-512']);

    marks.splice(0);

    expect(Scheduler).toFlushUntilNextPaint([]);

    expect(marks.map(normalizeCodeLocInfo)).toEqual([
      '--render-start-512',
      '--render-stop',
      '--commit-start-512',
      '--layout-effects-start-512',
      '--schedule-state-update-1-Example-\n    in Example (at **)',
      '--layout-effects-stop',
      '--render-start-1',
      '--render-stop',
      '--commit-start-1',
      '--commit-stop',
      '--commit-stop',
    ]);
  });

  // @gate enableSchedulingProfiler
  it('should mark cascading class component force updates', () => {
    class Example extends React.Component {
      componentDidMount() {
        this.forceUpdate();
      }
      render() {
        return null;
      }
    }

    ReactTestRenderer.create(<Example />, {unstable_isConcurrent: true});

    expect(marks).toEqual(['--schedule-render-512']);

    marks.splice(0);

    expect(Scheduler).toFlushUntilNextPaint([]);

    expect(marks.map(normalizeCodeLocInfo)).toEqual([
      '--render-start-512',
      '--render-stop',
      '--commit-start-512',
      '--layout-effects-start-512',
      '--schedule-forced-update-1-Example-\n    in Example (at **)',
      '--layout-effects-stop',
      '--render-start-1',
      '--render-stop',
      '--commit-start-1',
      '--commit-stop',
      '--commit-stop',
    ]);
  });

  // @gate enableSchedulingProfiler
  it('should mark render phase state updates for class component', () => {
    class Example extends React.Component {
      state = {didRender: false};
      render() {
        if (this.state.didRender === false) {
          this.setState({didRender: true});
        }
        return null;
      }
    }

    ReactTestRenderer.create(<Example />, {unstable_isConcurrent: true});

    expect(marks).toEqual(['--schedule-render-512']);

    marks.splice(0);

    expect(() => {
      expect(Scheduler).toFlushUntilNextPaint([]);
    }).toErrorDev('Cannot update during an existing state transition');

    gate(({old}) =>
      old
        ? expect(marks.map(normalizeCodeLocInfo)).toContain(
            '--schedule-state-update-1024-Example-\n    in Example (at **)',
          )
        : expect(marks.map(normalizeCodeLocInfo)).toContain(
            '--schedule-state-update-512-Example-\n    in Example (at **)',
          ),
    );
  });

  // @gate enableSchedulingProfiler
  it('should mark render phase force updates for class component', () => {
    class Example extends React.Component {
      state = {didRender: false};
      render() {
        if (this.state.didRender === false) {
          this.forceUpdate(() => this.setState({didRender: true}));
        }
        return null;
      }
    }

    ReactTestRenderer.create(<Example />, {unstable_isConcurrent: true});

    expect(marks).toEqual(['--schedule-render-512']);

    marks.splice(0);

    expect(() => {
      expect(Scheduler).toFlushUntilNextPaint([]);
    }).toErrorDev('Cannot update during an existing state transition');

    gate(({old}) =>
      old
        ? expect(marks.map(normalizeCodeLocInfo)).toContain(
            '--schedule-forced-update-1024-Example-\n    in Example (at **)',
          )
        : expect(marks.map(normalizeCodeLocInfo)).toContain(
            '--schedule-forced-update-512-Example-\n    in Example (at **)',
          ),
    );
  });

  // @gate enableSchedulingProfiler
  it('should mark cascading layout updates', () => {
    function Example() {
      const [didMount, setDidMount] = React.useState(false);
      React.useLayoutEffect(() => {
        setDidMount(true);
      }, []);
      return didMount;
    }

    ReactTestRenderer.create(<Example />, {unstable_isConcurrent: true});

    expect(marks).toEqual(['--schedule-render-512']);

    marks.splice(0);

    expect(Scheduler).toFlushUntilNextPaint([]);

    expect(marks.map(normalizeCodeLocInfo)).toEqual([
      '--render-start-512',
      '--render-stop',
      '--commit-start-512',
      '--layout-effects-start-512',
      '--schedule-state-update-1-Example-\n    in Example (at **)',
      '--layout-effects-stop',
      '--render-start-1',
      '--render-stop',
      '--commit-start-1',
      '--commit-stop',
      '--commit-stop',
    ]);
  });

  // @gate enableSchedulingProfiler
  it('should mark cascading passive updates', () => {
    function Example() {
      const [didMount, setDidMount] = React.useState(false);
      React.useEffect(() => {
        setDidMount(true);
      }, []);
      return didMount;
    }

    ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<Example />, {unstable_isConcurrent: true});
    });
    expect(marks.map(normalizeCodeLocInfo)).toEqual([
      '--schedule-render-512',
      '--render-start-512',
      '--render-stop',
      '--commit-start-512',
      '--layout-effects-start-512',
      '--layout-effects-stop',
      '--commit-stop',
      '--passive-effects-start-512',
      '--schedule-state-update-1024-Example-\n    in Example (at **)',
      '--passive-effects-stop',
      '--render-start-1024',
      '--render-stop',
      '--commit-start-1024',
      '--commit-stop',
    ]);
  });

  // @gate enableSchedulingProfiler
  it('should mark render phase updates', () => {
    function Example() {
      const [didRender, setDidRender] = React.useState(false);
      if (!didRender) {
        setDidRender(true);
      }
      return didRender;
    }

    ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<Example />, {unstable_isConcurrent: true});
    });

    gate(({old}) =>
      old
        ? expect(marks.map(normalizeCodeLocInfo)).toContain(
            '--schedule-state-update-1024-Example-\n    in Example (at **)',
          )
        : expect(marks.map(normalizeCodeLocInfo)).toContain(
            '--schedule-state-update-512-Example-\n    in Example (at **)',
          ),
    );
  });
});
