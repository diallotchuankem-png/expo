import type { LoaderClient } from './LoaderClient';

type LoaderFetcher<T> = (path: string) => Promise<T>;

/**
 * Read for `useLoaderData`. The per-mount Suspense store ensures a re-render returns the settled
 * value, error, or in-flight promise. A fresh mount fetches so the platform HTTP cache decides
 * freshness.
 */
export function readLoaderData<T>(
  client: LoaderClient,
  resolvedPath: string,
  fetcher: LoaderFetcher<T>
): T | Promise<T> {
  const suspended = client.suspense.get<T>(resolvedPath);
  if (suspended instanceof Promise) {
    return suspended;
  }
  if (suspended) {
    if ('error' in suspended) {
      client.suspense.expireError(resolvedPath);
      throw suspended.error;
    }
    return suspended.data;
  }

  // Publish the settled result only while this fetch still owns the entry. An entry reclaimed
  // on unmount, or reset by invalidation, must stay empty so the next mount fetches fresh.
  const promise: Promise<T> = fetchDeduped(client, resolvedPath, fetcher).then(
    (data) => {
      if (client.suspense.get(resolvedPath) === promise) {
        client.suspense.set(resolvedPath, { data });
      }
      return data;
    },
    (error) => {
      if (client.suspense.get(resolvedPath) === promise) {
        client.suspense.set(resolvedPath, { error });
      }
      throw error;
    }
  );
  client.suspense.set(resolvedPath, promise);
  return promise;
}

function fetchDeduped<T>(
  client: LoaderClient,
  path: string,
  fetcher: LoaderFetcher<T>
): Promise<T> {
  const inFlight = client.getPromise<T>(path);
  if (inFlight) {
    return inFlight;
  }

  const promise = fetcher(path)
    .then((data) => {
      client.deletePromise(path);
      return data;
    })
    .catch((error) => {
      client.deletePromise(path);
      throw new Error(`Failed to load loader data for route: ${path}`, {
        cause: error,
      });
    });

  client.setPromise(path, promise);
  return promise;
}
