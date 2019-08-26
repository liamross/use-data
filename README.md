# Use Data [![Build Status](https://travis-ci.org/liamross/use-data.svg?branch=master)](https://travis-ci.org/liamross/use-data) [![NPM Version](https://badge.fury.io/js/use-data.svg)](https://www.npmjs.com/package/use-data)

1. Fetches data from an async function
1. Allows you to manipulate the data à la Redux
1. Will throw out outdated API calls by default

Basic usage:

```jsx
import React from 'react';
import useData from 'use-data';
import {someApi} from './someApi';

const FunctionalComponent = ({someProp}) => {
  const {loading, error, data} = useData(() => someApi(someProp));

  if (error) return <p>Error...</p>;
  if (loading) return <p>Loading...</p>;
  return <p>{data.someString}</p>;
};
```

<details><summary>Expand for more advanced usage with TypeScript:</summary>

```tsx
import React, {FC, useEffect} from 'react';
import useData from 'use-data';
import {getUser} from './getUserAPI';

const FunctionalComponent: FC<{userId: string}> = ({userId}) => {
  const {loading, error, data, fireFetch, setData} = useData<{
    username: string;
    age: number;
  }>(() => getUser(userId), {
    fireOnMount: false, // We want to wait until we are sure userId exists.
  });

  useEffect(() => {
    // Wait for userId to fetch (see `fireOnMount: false`).
    if (userId) fireFetch();
  }, [fireFetch, userId]);

  const handleSetUsername = () => {
    // Uses the function option for newData in order to only change username.
    setData(oldUser => ({...oldUser!, username: 'John Doe'}));
  };

  if (error) return <p>Error...</p>;
  if (loading) return <p>Loading...</p>;
  return (
    <>
      <p>{data!.username}</p>
      <button onClick={handleSetUsername}>
        {"Set username to 'John Doe'"}
      </button>
    </>
  );
};
```

</details>

<details><summary>Expand for setting up hook with Context:</summary>

```tsx
import React, {createContext, FC} from 'react';
import useData, {StatusObject} from 'use-data';
import {getName} from './getNameAPI';

interface ContextData {
  firstName: string;
  lastName: string;
}

export const NameContext = createContext<StatusObject<ContextData>>({
  loading: false,
  error: new Error('No Provider'),
  data: null,
  fireFetch: () => new Error('No Provider'),
  setData: () => new Error('No Provider'),
});

export const NameProvider: FC = ({children}) => {
  const statusObject = useData(getName);

  return (
    <NameContext.Provider value={statusObject}>{children}</NameContext.Provider>
  );
};
```

</details>

## API

The `useData` hook is the only export (besides TypeScript interfaces and types).
The type definition is as follows:

```ts
declare function useData<D>(
  asyncFetch: () => Promise<D>,
  options?: UseDataOptions<D>,
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

#### `options` - _`UseDataOptions`_

Options is an optional object that has the following structure:

```ts
interface UseDataOptions<D> {
  fireOnMount?: boolean;
  takeEvery?: boolean;
  initialData?: D;
}
```

1. `fireOnMount` (Default: _true_) - Should the hook fire the `asyncFetch` on
   mount. If true, `loading` is true. If false, `loading` is true as long as no
   `initialData` is provided.
1. `takeEvery` (Default: _false_) - Should the hook take every call rather than
   throwing out active calls when new ones are made.
1. `initialData` (Default: _undefined_) - If given, will populate `data` prior
   to fetching. If provided along with `fireOnMount: false`, will make `loading`
   false, as this `initialData` serves as a placeholder until the fetch is
   completed. Initial data must match the return type of `asyncFetch`, or the
   generic `D`. For example, the following will result in an error:

   ```ts
   const {loading, error, data} = useData(
     async () => {
       return {a: {b: 'b contents'}};
     },
     {initialData: {a: null}},
   );
   ```

   This is because it expects `initialData` to be of type `{a: {b: string}}`. To
   fix this, you will need to define the generic as `{a: null | {b: string}}` to
   help TypeScript know that `a` can be either `null` or `{b: string}`:

   ```ts
   const {loading, error, data} = useData<{a: null | {b: string}}>(
     async () => {
       return {a: {b: 'b contents'}};
     },
     {initialData: {a: null}},
   );
   ```

#### `@returns` - _`StatusObject<D>`_

The hook returns a status object. The type definition is as follows:

```ts
interface StatusObject<D> {
  loading: boolean;
  error: Error | null;
  data: D | null;
  fireFetch: (newAsyncFetch?: () => Promise<D>) => void;
  setData: (
    newData: D | ((oldData: D | null) => D),
    stopLoading?: boolean,
  ) => void;
}
```

1. `loading` - True whenever fetching is occurring. Initially, if `fireOnMount`
   is false and `initialData` is provided, will be false, since there is data
   provided by `initialData`.
1. `error` - The error object if your fetch fails, or null if not failed.
1. `data` - The data from your async fetch, or null if not fetched.
1. `fireFetch` - Fire the async function that was provided to useData. You may
   pass it an async function to call instead of `asyncFetch`,
1. `setData` - Mutate the data. Either a function that takes old data and
   returns the new data, or data of type `D`. Calling this will turn `error` to
   null. Additionally takes a parameter to stop loading when called (loading
   will continue by default).
