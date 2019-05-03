/* eslint-disable no-console */

import {mount} from 'enzyme';
import React, {FC, useEffect} from 'react';
import {act} from 'react-dom/test-utils';
import {useData} from './useData';

/* --- Helpers --- */

const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/* --- Components --- */

const FireFetch: FC<{fn: Function}> = ({fn}) => {
  const {data} = useData<'fail' | 'pass' | ''>(async () => {
    return 'pass';
  });
  useEffect(() => {
    if (data) fn();
  }, [fn, data]);
  return null;
};

const FireFetchWithNewFunction: FC<{fn: Function}> = ({fn}) => {
  const {data, fireFetch} = useData<'fail' | 'pass' | ''>(async () => {
    await timeout(50);
    return 'fail';
  }, '');
  useEffect(() => {
    fireFetch(async () => {
      return 'pass';
    });
  }, [fireFetch]);
  useEffect(() => {
    if (data) {
      if (data === 'fail') fn('First call still went through');
      if (data === 'pass') fn();
    }
  }, [fn, data]);
  return null;
};

/* --- Tests --- */

describe('Use Data Hook', () => {
  // This is just a little hack to silence a warning that we'll get until react
  // fixes this: https://github.com/facebook/react/pull/14853
  const originalError = console.error;
  beforeAll(() => {
    console.error = (...args: string[]) => {
      if (/Warning.*not wrapped in act/.test(args[0])) return;
      originalError.call(console, ...args);
    };
  });
  afterAll(() => (console.error = originalError));

  it('calls asyncFetch to fetch data', done => {
    act(() => {
      mount(<FireFetch fn={done} />);
    });
  });

  it('only gets data from a second call if the first is in progress', done => {
    act(() => {
      mount(<FireFetchWithNewFunction fn={done} />);
    });
  });
});
