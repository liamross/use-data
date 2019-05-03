import {Reducer, useCallback, useEffect, useMemo, useReducer, useRef} from 'react';

/* --- Types --- */

export interface UseDataOptions {
  /**
   * Should the hook fire the `asyncFetch` on mount.
   * @default true
   */
  fireOnMount?: boolean;
  /**
   * Should the hook take every call rather than throwing out active calls when
   * new ones are made.
   * @default false
   */
  takeEvery?: boolean;
}

type UseDataAction<D> =
  | {type: 'FETCH_INIT'}
  | {type: 'FETCH_SUCCESS'; payload: D}
  | {type: 'FETCH_FAILURE'; payload: Error}
  | {type: 'CHANGE_DATA'; payload: {data: D; stopLoading: boolean}};

interface UseDataState<D> {
  /** True if currently fetching. */
  loading: boolean;
  /** The error object if your fetch fails. */
  error: Error | null;
  /** The data from your async fetch, or null if not fetched. */
  data: D | null;
}

export interface StatusObject<D> extends UseDataState<D> {
  /**
   * Fire the async function that was provided to useData.
   * @param newAsyncFetch Optional. If provided, will call this instead of `asyncFetch`.
   */
  fireFetch: (newAsyncFetch?: () => Promise<D>) => void;
  /**
   * Mutate the data.
   * @param newData A new data, or a function that is given old data and returns the new data.
   * @param stopLoading Optional. Default false. Should loading stop when setData is called?
   */
  setData: (newData: D | ((oldData: D | null) => D), stopLoading?: boolean) => void;
}

/* --- Functions --- */

/** Generates the reducer in order to allow for generic typing. */
const dataFetchReducer = <D>() => {
  const reducer: Reducer<UseDataState<D>, UseDataAction<D>> = (state, action) => {
    switch (action.type) {
      case 'FETCH_INIT':
        if (state.loading === true) return state;
        return {...state, loading: true};
      case 'FETCH_SUCCESS':
        return {...state, loading: false, error: null, data: action.payload};
      case 'FETCH_FAILURE':
        return {...state, loading: false, error: action.payload};
      case 'CHANGE_DATA':
        return {
          ...state,
          loading: action.payload.stopLoading ? false : state.loading,
          error: null,
          data: action.payload.data,
        };
      default:
        throw new Error(`Invalid reducer type`);
    }
  };
  return reducer;
};

/**
 * Makes an async call to the provided function on component mount, and provides
 * an array containing an `IStatusObject` that displays loading status, fetched
 * data, and errors, and a callback function to retry the `asyncFetch`.
 *
 * @param asyncFetch The async function that fetches your data.
 * @param initialData Optional. If given will initially populate data.
 * @param options Optional. Additional options for the hook.
 */
export function useData<D>(
  asyncFetch: () => Promise<D>,
  initialData?: D,
  options: UseDataOptions = {},
): StatusObject<D> {
  const fireOnMount = options.fireOnMount === undefined ? true : options.fireOnMount;
  const takeEvery = options.takeEvery === undefined ? false : options.takeEvery;

  const fnStartTime = useRef<number | null>(null);

  // https://overreacted.io/making-setinterval-declarative-with-react-hooks/#refs-to-the-rescue
  const savedAsyncFunc = useRef(asyncFetch);
  useEffect(() => {
    savedAsyncFunc.current = asyncFetch;
  });

  const [state, dispatch] = useReducer(dataFetchReducer<D>(), {
    loading: true,
    error: null,
    data: initialData || null,
  });

  const fetchData = useCallback<(newAsyncFetch?: typeof asyncFetch) => void>(
    async newAsyncFetch => {
      const startTime = new Date().getTime();
      fnStartTime.current = startTime;
      dispatch({type: 'FETCH_INIT'});
      try {
        let data;
        if (newAsyncFetch) {
          data = await newAsyncFetch();
        } else {
          data = await savedAsyncFunc.current();
        }
        if (takeEvery || fnStartTime.current === startTime) {
          dispatch({type: 'FETCH_SUCCESS', payload: data});
        }
      } catch (error) {
        dispatch({type: 'FETCH_FAILURE', payload: error});
      }
    },
    [takeEvery],
  );

  useEffect(() => {
    fireOnMount && fetchData();
  }, [fireOnMount, fetchData]);

  const fireFetch = useCallback<StatusObject<D>['fireFetch']>(
    newAsyncFetch => {
      fetchData(newAsyncFetch);
    },
    [fetchData],
  );

  const setData = useCallback<StatusObject<D>['setData']>(
    (newData, stopLoading = false) => {
      let data;
      if (typeof newData === 'function') {
        data = (newData as Function)(state.data);
      } else {
        data = newData;
      }
      dispatch({type: 'CHANGE_DATA', payload: {data, stopLoading}});
    },
    [state.data],
  );

  return useMemo<StatusObject<D>>(() => ({...state, fireFetch, setData}), [state, fireFetch, setData]);
}
