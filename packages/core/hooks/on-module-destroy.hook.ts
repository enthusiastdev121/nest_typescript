import { OnModuleDestroy } from '@nestjs/common';
import { isNil, isUndefined } from '@nestjs/common/utils/shared.utils';
import iterate from 'iterare';
import { InstanceWrapper } from '../injector/instance-wrapper';
import { Module } from '../injector/module';
import {
  getNonTransientInstances,
  getTransientInstances,
} from '../injector/transient-instances';

/**
 * Returns true or false if the given instance has a `onModuleDestroy` function
 *
 * @param instance The instance which should be checked
 */
function hasOnModuleDestroyHook(
  instance: unknown,
): instance is OnModuleDestroy {
  return !isUndefined((instance as OnModuleDestroy).onModuleDestroy);
}

/**
 * Calls the given instances onModuleDestroy hook
 */
function callOperator(instances: InstanceWrapper[]): Promise<any>[] {
  return iterate(instances)
    .filter(instance => !isNil(instance))
    .filter(hasOnModuleDestroyHook)
    .map(async instance =>
      ((instance as any) as OnModuleDestroy).onModuleDestroy(),
    )
    .toArray();
}

/**
 * Calls the `onModuleDestroy` function on the module and its children
 * (providers / controllers).
 *
 * @param module The module which will be initialized
 */
export async function callModuleDestroyHook(module: Module): Promise<any> {
  const providers = [...module.providers];
  // Module (class) instance is the first element of the providers array
  // Lifecycle hook has to be called once all classes are properly destroyed
  const [_, { instance: moduleClassInstance }] = providers.shift();
  const instances = [...module.controllers, ...providers];

  const nonTransientInstances = getNonTransientInstances(instances);
  await Promise.all(callOperator(nonTransientInstances));

  const transientInstances = getTransientInstances(instances);
  await Promise.all(callOperator(transientInstances));

  // Call the module instance itself
  if (moduleClassInstance && hasOnModuleDestroyHook(moduleClassInstance)) {
    await (moduleClassInstance as OnModuleDestroy).onModuleDestroy();
  }
}
