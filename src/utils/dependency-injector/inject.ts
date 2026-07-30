import { ServiceMetadata } from "./metadata";
import { ConstructorArgs } from "./service";

export interface Constructor {
  new(...args: any[]): any;
}

export type Dependency<T extends Constructor> = {
  constructor: T;
  args?: ConstructorArgs<T>;
  initiator?: (C: T, parent: any) => InstanceType<T>;
};

/**
 * Mark a class property as a dependency. When the class is instantiated, the
 * dependency will be injected.
 *
 * If a default dependency is set via `Service.setDefaultDependency`, value
 * provided to that method will be the one injected by default.
 *
 * If a service is initiated using the `init()` method, the dependencies
 * provided to it will override the defaults.
 */
export const Inject = <T extends Constructor>(
  constructor: T,
  opts?: {
    args?: ConstructorArgs<T>;
    init?: (C: T, parent: any) => InstanceType<T>;
    initAfterSuper?: boolean;
  },
) => {
  const dep: Dependency<T> = {
    constructor,
    initiator: opts?.init,
    args: opts?.args,
  };

  return (proto: object, key: string) => {
    const keys: string[] = Reflect.getMetadata(ServiceMetadata.Keys, proto) ?? [];

    Reflect.defineMetadata(ServiceMetadata.Keys, [...keys, key], proto);

    if (opts?.initAfterSuper) {
      Reflect.defineMetadata(ServiceMetadata.InjectAfter, dep, proto, key);
    } else {
      Reflect.defineMetadata(ServiceMetadata.InjectBefore, dep, proto, key);
    }
  };
};
