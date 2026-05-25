/**
 * SVG snapshot guard for the bee mascot family. Catches accidental
 * drift in the brand poses (eg someone changing the eyebrow strokes).
 *
 * If a pose intentionally changes, update with `jest -u`.
 */
import React from 'react';
import renderer from 'react-test-renderer';
import {
  BeeStanding,
  BeeLookingAround,
  BeeMagnifying,
  BeeSleeping,
  BeeEnvelope,
  BeeLogoMark,
  BEE_POSES,
} from './bee';

describe('Bee poses', () => {
  it.each([
    ['BeeStanding', BeeStanding],
    ['BeeLookingAround', BeeLookingAround],
    ['BeeMagnifying', BeeMagnifying],
    ['BeeSleeping', BeeSleeping],
    ['BeeEnvelope', BeeEnvelope],
    ['BeeLogoMark', BeeLogoMark],
  ])('renders %s without crashing', (_name, Component) => {
    const tree = renderer.create(<Component size={64} />).toJSON();
    expect(tree).toBeTruthy();
  });

  it('matches the BeeStanding snapshot', () => {
    const tree = renderer.create(<BeeStanding size={96} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('matches the BeeLogoMark snapshot', () => {
    const tree = renderer.create(<BeeLogoMark size={40} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('exports every documented pose in the BEE_POSES map', () => {
    expect(Object.keys(BEE_POSES).sort()).toEqual(
      [
        'envelope',
        'logoMark',
        'looking',
        'lookingAround',
        'magnifying',
        'mail',
        'sleeping',
        'standing',
      ].sort(),
    );
  });
});
