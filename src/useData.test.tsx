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
  const {data, fireFetch} = useData<'fail' | 'pass' | ''>(
    async () => {
      await timeout(50);
      return 'fail';
    },
    {initialData: ''},
  );
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

const FireFetchOnFnChange: FC<{fn: () => Promise<string>; done: Function}> = ({fn, done}) => {
  const {data, fireFetch} = useData(fn);
  useEffect(() => {
    if (data === 'pass') done();
  }, [done, data]);
  useEffect(() => fireFetch(), [fn]); // eslint-disable-line react-hooks/exhaustive-deps
  return <>{data}</>;
};

/* --- Tests --- */

describe('Use Data Hook', () => {
  it('calls asyncFetch to fetch data', async done => {
    await act(async () => {
      mount(<FireFetch fn={done} />);
    });
  });

  it('only gets data from a second call if the first is in progress', async done => {
    await act(async () => {
      mount(<FireFetchWithNewFunction fn={done} />);
    });
  });

  it('does not call stale asyncFetch function if updated', async done => {
    await act(async () => {
      const badFn = async () => '';
      const goodFn = async () => 'pass';
      const wrapper = mount(<FireFetchOnFnChange fn={badFn} done={done} />);
      wrapper.update();
      wrapper.setProps({fn: goodFn});
    });
  });
});
