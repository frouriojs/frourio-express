import type { DefineMethods } from 'aspida';
import type { Body, Query } from '../validators';

export type Methods = DefineMethods<{
  get: {
    query?: Query;
    status: 200;
    resBody?: { id: number };
  };

  post: {
    query: Query;
    reqBody: Body;
    status: 201;
    resBody: {
      id: number;
      port: string;
    };
  };
}>;
