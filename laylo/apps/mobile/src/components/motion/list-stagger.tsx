/**
 * ListStagger / ListStaggerItem — RN port of apps/web/.../list-stagger.tsx.
 *
 * Cascades list items in on mount using `FallIntoPlace` under the hood. The
 * existing `StaggeredListItem` (Phase 3b) targets a different ergonomic
 * (manual index per item) and uses Reanimated layout-animation entries; this
 * version mirrors the web's "stack of items, just wrap and go" API.
 *
 * Usage:
 *   <ListStagger>
 *     {items.map((it) => (
 *       <ListStaggerItem key={it.id}>{render(it)}</ListStaggerItem>
 *     ))}
 *   </ListStagger>
 *
 * The parent owns spacing — we don't impose padding or gap. The children
 * pick up an automatically incrementing `index` via React.Children, so the
 * cascade reads top-to-bottom without callers tracking the index manually.
 *
 * Reduced motion: items render at rest (handled inside FallIntoPlace).
 */
import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { FallIntoPlace } from './fall-into-place';

export type ListStaggerProps = {
  children: React.ReactNode;
  /** Per-item stagger in ms. Default 60. */
  stagger?: number;
  /** Entry direction for all items. Default 'top'. */
  from?: 'top' | 'bottom';
  style?: ViewStyle | ViewStyle[];
};

export function ListStagger({
  children,
  stagger = 60,
  from = 'top',
  style,
}: ListStaggerProps) {
  // Map only the *direct* children that are valid elements. Anything else
  // (null, false, strings) passes through untouched.
  const items = React.Children.toArray(children);
  return (
    <View style={style}>
      {items.map((child, i) => {
        if (!React.isValidElement(child)) return child;
        // If the child is already a <ListStaggerItem>, clone with the index;
        // otherwise wrap it ourselves so callers can just hand us plain views.
        const isItem =
          (child.type as { displayName?: string } | undefined)?.displayName ===
          'ListStaggerItem';
        if (isItem) {
          return React.cloneElement(child as React.ReactElement<ListStaggerItemProps>, {
            index: i,
            stagger,
            from,
          });
        }
        return (
          <FallIntoPlace key={i} index={i} stagger={stagger} from={from}>
            {child}
          </FallIntoPlace>
        );
      })}
    </View>
  );
}

export type ListStaggerItemProps = {
  children: React.ReactNode;
  /** Filled in by the parent ListStagger — callers don't pass this. */
  index?: number;
  /** Filled in by the parent ListStagger. */
  stagger?: number;
  /** Filled in by the parent ListStagger. */
  from?: 'top' | 'bottom';
  style?: ViewStyle | ViewStyle[];
};

export function ListStaggerItem({
  children,
  index = 0,
  stagger = 60,
  from = 'top',
  style,
}: ListStaggerItemProps) {
  return (
    <FallIntoPlace index={index} stagger={stagger} from={from} style={style}>
      {children}
    </FallIntoPlace>
  );
}

ListStaggerItem.displayName = 'ListStaggerItem';

export default ListStagger;
