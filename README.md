# Use Data Hook [![Build Status](https://travis-ci.org/liamross/use-data-hook.svg?branch=master)](https://travis-ci.org/liamross/use-data-hook) [![NPM Version](https://badge.fury.io/js/use-data-hook.svg)](https://www.npmjs.com/package/use-data-hook)

1. Fetches data from an async function
1. Allows you to manipulate the data à la Redux
1. Will throw out outdated API calls by default

Basic usage:

```tsx
const FunctionalComponent = ({someProp}) => {
  const {loading, error, data} = useData(() => someApi(someProp));

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error...</p>;
  return <p>{data.someString}</p>;
};
```

<details><summary>Expand for more advanced usage:</summary>

```tsx
const FunctionalComponent: FC<{userId?: string}> = ({userId}) => {
  const {loading, error, data, fireFetch, setData} = useData(
    () => getUser(userId),
    {username: '', age: 0},
    {fireOnMount: false, takeEvery: true},
  );

  useEffect(() => {
    // Wait for userId to fetch (see fireOnMount is false).
    if (userId) fireFetch();
  }, [userId]);

  const handleSetUsername = () => {
    // Uses the function option for newData in order to only change username.
    setData(oldUser => ({...oldUser, username: 'John Doe'}));
  };

  if (error) return <p>Error...</p>;
  if (loading) return <p>Loading...</p>;
  return (
    <>
      <p>{data.username}</p>
      <button onClick={handleSetUsername}>{"Set username to 'John Doe'"}</button>
    </>
  );
};
```

</details>

## API

The `useData` hook is the only non-type export. The type definition is as
follows:

```ts
declare function useData<D>(
  asyncFetch: () => Promise<D>,
  initialData?: D,
  options?: UseDataOptions,
): StatusObject<D>;
```

If you are using this in a TypeScript project, you do not need to provide a type
for the generic `D`, as it will be automatically parsed from the return type of
`asyncFetch`. However in some cases it may be desirable to define it (see more
information in the `initialData` section).

It accepts three arguments:

#### `asyncFetch` - _`() => Promise<D>`_

Any async fetch function that you want to use to fetch data from. The type will
be automatically parsed from the return type.

Example usage:

```ts
// If your function takes no arguments, you can pass it in directly:
const {loading, error, data} = useData(asyncFetch);

// If it requires arguments, wrap it in an arrow function:
const {loading, error, data} = useData(() => asyncFetch(someValue));
```

#### `initialData` - _`D`_

Initial data must match the return type of `asyncFetch`, or the generic `D`. For
example, the following will result in an error:

```ts
const {loading, error, data} = useData(
  async () => {
    return {a: {b: 'b contents'}};
  },
  {a: null},
);
```

This is because it expects `initialData` to be of type `{ a: { b: string; }; }`.
To fix this, you will need to define the generic:

```ts
const {loading, error, data} = useData<{a: null | {b: string}}>(
  async () => {
    return {a: {b: 'b contents'}};
  },
  {a: null},
);
```

This will allow the property `a` to be either null or `{ b: string; }`.

#### `options` - _`UseDataOptions`_

Options is an optional object that has the following structure:

```ts
export interface UseDataOptions {
  fireOnMount?: boolean;
  takeEvery?: boolean;
}
```

1. `fireOnMount` - Default: _true_. Should the hook fire the `asyncFetch` on
   mount.
1. `takeEvery` - Default: _false_. Should the hook take every call rather than
   throwing out active calls when new ones are made.

#### `@returns` - _`StatusObject<D>`_

The hook returns an object with 5 properties:

1. `loading` - True if currently fetching.
1. `error` - The error object if your fetch fails, or null if not failed.
1. `data` - The data from your async fetch, or null if not fetched.
1. `fireFetch` - Fire the async function that was provided to useData. You may
   pass it an async function to call instead of `asyncFetch`,
1. `setData` - Mutate the data. Either a function that takes old data and
   returns the new data, or data of type `D`. Calling this will turn `error` to
   null. Additionally takes a parameter to stop loading when called (loading
   will continue by default).

```ts
interface UseDataState<D> {
  loading: boolean;
  error: Error | null;
  data: D | null;
}

interface StatusObject<D> extends UseDataState<D> {
  fireFetch: (newAsyncFetch?: () => Promise<D>) => void;
  setData: (
    newData: D | ((oldData: D | null) => D),
    stopLoading?: boolean,
  ) => void;
}
```
