import type { Constructor, Dependency } from "./inject";
import { ServiceMetadata } from "./metadata";

export interface Injectable {
  __init_service?: (
    args: ConstructorArgs<any>,
    dependencies: Dependencies | Map<Injectable, DependencyOverride>,
  ) => any;
  new(): any;
}
export type DependencyOverride = Injectable | object;

export type Dependencies = Array<[Constructor, DependencyOverride]>;

export type ConstructorArgs<C> = C extends new(...args: infer T extends any[]) => any ? T : [];

const defaultDependencies = new Map<Constructor, InstanceType<Injectable>>();

function isConstructor(obj: object): obj is Injectable {
  // @ts-expect-error
  return !!obj.prototype && !!obj.prototype.constructor;
}

function initializeDependency(
  service: Service,
  dependency: any,
  args: any[],
  overrides: Dependencies | Map<Injectable, DependencyOverride>,
  initiator?: (C: any, parent: Service) => any,
) {
  if (initiator != null) {
    return initiator(dependency, service);
  }

  if (isConstructor(dependency)) {
    if (dependency.__init_service) {
      return dependency.__init_service(args, overrides);
    } else {
      return new dependency();
    }
  } else {
    return dependency;
  }
}

export class Service {
  private static __init_service<T extends new(...args: any) => any>(
    this: T,
    args: ConstructorArgs<T>,
    dependencies: Dependencies | Map<Constructor, DependencyOverride>,
  ): InstanceType<T> {
    const orgClassName = (this as any).name;
    const dependenciesOverrides = new Map(dependencies);

    const classes = {} as any;

    classes[orgClassName] = class extends (this as any) {
      __dependenciesOverrides() {
        return dependenciesOverrides;
      }
      __reflectProto() {
        return this;
      }
    };

    Object.defineProperty(classes[orgClassName], "name", { value: orgClassName });

    const instance = new classes[orgClassName](...args) as Service;
    instance.__initializeDependenciesAfter();
    return instance as any;
  }

  /**
   * By default each injected dependency is a new instance of the given class.
   * This method allows to either replace the constructor of the dependency with
   * another one, or provide a value that will be injected instead.
   */
  static setDefaultDependency<T extends Injectable>(
    dependencyConstructor: T,
    instance: InstanceType<T> | T,
  ) {
    defaultDependencies.set(dependencyConstructor, instance);
  }

  /**
   * Initialize a service and injects the provided dependencies into it and it's
   * dependents. When a dependency is not provided but is used by the Service, the
   * default one will be used.
   */
  static new<T extends new(...args: any) => any>(
    this: T,
    initProps: {
      args?: ConstructorArgs<T>;
      deps?: Dependencies;
    },
  ): InstanceType<T> {
    return (this as any).__init_service(initProps.args ?? [], initProps.deps ?? []);
  }

  declare protected __reflectProto?: () => object;
  declare protected __dependenciesOverrides?: () => Map<Constructor, DependencyOverride>;

  constructor() {
    this.__initializeDependenciesBefore();
  }

  private __initializeDependenciesBefore() {
    const proto = this.__reflectProto?.() ?? Object.getPrototypeOf(this);

    const dependenciesOverrides = this.__dependenciesOverrides?.() ?? new Map();

    const keys = Reflect.getMetadata(ServiceMetadata.Keys, proto);

    if (keys) {
      for (const key of keys) {
        const dependency: Dependency<Constructor> = Reflect.getMetadata(
          ServiceMetadata.InjectBefore,
          proto,
          key,
        );

        if (!dependency) continue;

        const override = dependenciesOverrides.get(dependency.constructor);

        if (override) {
          Object.assign(this, {
            [key]: initializeDependency(this, override, dependency.args ?? [], dependenciesOverrides),
          });
        } else {
          const defaultInstance = defaultDependencies.get(dependency.constructor);

          if (defaultInstance) {
            Object.assign(this, {
              [key]: initializeDependency(this, defaultInstance, dependency.args ?? [], dependenciesOverrides),
            });
          } else {
            Object.assign(this, {
              [key]: initializeDependency(
                this,
                dependency.constructor,
                dependency.args ?? [],
                dependenciesOverrides,
                dependency.initiator,
              ),
            });
          }
        }
      }
    }

    return this;
  }

  private __initializeDependenciesAfter() {
    const proto = this.__reflectProto?.() ?? Object.getPrototypeOf(this);

    const dependenciesOverrides = this.__dependenciesOverrides?.() ?? new Map();

    const keys = Reflect.getMetadata(ServiceMetadata.Keys, proto);

    if (keys) {
      for (const key of keys) {
        const dependency: Dependency<Constructor> = Reflect.getMetadata(
          ServiceMetadata.InjectAfter,
          proto,
          key,
        );

        if (!dependency) continue;

        const override = dependenciesOverrides.get(dependency.constructor);

        if (override) {
          Object.assign(this, {
            [key]: initializeDependency(this, override, dependency.args ?? [], dependenciesOverrides),
          });
        } else {
          const defaultInstance = defaultDependencies.get(dependency.constructor);

          if (defaultInstance) {
            Object.assign(this, {
              [key]: initializeDependency(this, defaultInstance, dependency.args ?? [], dependenciesOverrides),
            });
          } else {
            Object.assign(this, {
              [key]: initializeDependency(
                this,
                dependency.constructor,
                dependency.args ?? [],
                dependenciesOverrides,
                dependency.initiator,
              ),
            });
          }
        }
      }
    }

    return this;
  }

  /**
   * Instantiate a service. If this service has some dependencies overridden,
   * those will be propagated to the new service.
   *
   * This is especially useful when you want to create a new instance of a service
   * conditionally, since that's not possible with the `Inject()` decorator.
   */
  protected spawnService<S extends typeof Service>(
    service: S,
    initProps?: {
      args?: ConstructorArgs<S>;
      overrides?: Dependencies;
    },
  ): InstanceType<S> {
    let dependenciesOverrides = this.__dependenciesOverrides?.() ?? new Map();

    if (initProps?.overrides) {
      dependenciesOverrides = new Map(dependenciesOverrides);
      for (const [dependency, override] of initProps?.overrides ?? []) {
        dependenciesOverrides.set(dependency, override);
      }
    }

    const override = dependenciesOverrides.get(service);
    if (override) {
      return initializeDependency(this, override, initProps?.args ?? [], dependenciesOverrides);
    }

    return service.__init_service(initProps?.args ?? [] as ConstructorArgs<S>, dependenciesOverrides);
  }
}
