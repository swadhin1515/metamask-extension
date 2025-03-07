import { fireEvent, queryByRole, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { getEnvironmentType } from '../../../../app/scripts/lib/util';
import { ENVIRONMENT_TYPE_POPUP } from '../../../../shared/constants/app';
import mockState from '../../../../test/data/mock-state.json';
import { tEn } from '../../../../test/lib/i18n-helpers';
import { renderWithProvider } from '../../../../test/lib/render-helpers';
import SecurityTab from './security-tab.container';

jest.mock('../../../../app/scripts/lib/util', () => {
  const originalModule = jest.requireActual('../../../../app/scripts/lib/util');

  return {
    ...originalModule,
    getEnvironmentType: jest.fn(),
  };
});

describe('Security Tab', () => {
  delete mockState.metamask.featureFlags; // Unset featureFlags in order to test the default value
  mockState.appState.warning = 'warning'; // This tests an otherwise untested render branch

  const mockStore = configureMockStore([thunk])(mockState);

  function toggleCheckbox(testId, initialState, skipRender = false) {
    if (!skipRender) {
      renderWithProvider(<SecurityTab />, mockStore);
    }

    const container = screen.getByTestId(testId);
    const checkbox = queryByRole(container, 'checkbox');

    expect(checkbox).toHaveAttribute('value', initialState ? 'true' : 'false');

    fireEvent.click(checkbox); // This fires the onToggle method of the ToggleButton, but it doesn't change the value of the checkbox

    fireEvent.change(checkbox, {
      target: { value: !initialState }, // This changes the value of the checkbox
    });

    expect(checkbox).toHaveAttribute('value', initialState ? 'false' : 'true');

    return true;
  }

  it('should match snapshot', () => {
    const { container } = renderWithProvider(<SecurityTab />, mockStore);

    expect(container).toMatchSnapshot();
  });

  it('toggles opensea api enabled off', async () => {
    expect(await toggleCheckbox('enableOpenSeaAPI', true)).toBe(true);
  });

  it('toggles opensea api enabled on', async () => {
    mockState.metamask.openSeaEnabled = false;

    const localMockStore = configureMockStore([thunk])(mockState);
    renderWithProvider(<SecurityTab />, localMockStore);

    expect(await toggleCheckbox('enableOpenSeaAPI', false, true)).toBe(true);
  });

  it('toggles nft detection', async () => {
    expect(await toggleCheckbox('useNftDetection', true)).toBe(true);
  });

  it('toggles nft detection from another initial state', async () => {
    mockState.metamask.openSeaEnabled = false;
    mockState.metamask.useNftDetection = false;

    const localMockStore = configureMockStore([thunk])(mockState);
    renderWithProvider(<SecurityTab />, localMockStore);

    expect(await toggleCheckbox('useNftDetection', false, true)).toBe(true);
  });

  it('toggles phishing detection', async () => {
    expect(await toggleCheckbox('usePhishingDetection', true)).toBe(true);
  });

  it('toggles 4byte resolution', async () => {
    expect(await toggleCheckbox('4byte-resolution-container', true)).toBe(true);
  });

  it('toggles balance and token price checker', async () => {
    expect(await toggleCheckbox('currencyRateCheckToggle', true)).toBe(true);
  });

  it('toggles incoming txs', async () => {
    expect(await toggleCheckbox('showIncomingTransactions', false)).toBe(true);
  });

  it('should toggle token detection', async () => {
    expect(await toggleCheckbox('autoDetectTokens', true)).toBe(true);
  });

  it('toggles batch balance checks', async () => {
    expect(await toggleCheckbox('useMultiAccountBalanceChecker', false)).toBe(
      true,
    );
  });

  it('toggles metaMetrics', async () => {
    expect(await toggleCheckbox('participateInMetaMetrics', false)).toBe(true);
  });

  it('toggles SRP Quiz', async () => {
    renderWithProvider(<SecurityTab />, mockStore);

    expect(
      screen.queryByTestId(`srp_stage_introduction`),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('reveal-seed-words'));

    expect(screen.getByTestId(`srp_stage_introduction`)).toBeInTheDocument();

    const container = screen.getByTestId('srp-quiz-header');
    const checkbox = queryByRole(container, 'button');
    fireEvent.click(checkbox);

    expect(
      screen.queryByTestId(`srp_stage_introduction`),
    ).not.toBeInTheDocument();
  });

  it('sets IPFS gateway', async () => {
    const user = userEvent.setup();
    renderWithProvider(<SecurityTab />, mockStore);

    const ipfsField = screen.getByDisplayValue(mockState.metamask.ipfsGateway);

    await user.click(ipfsField);

    await userEvent.clear(ipfsField);

    expect(ipfsField).toHaveValue('');
    expect(screen.queryByText(tEn('invalidIpfsGateway'))).toBeInTheDocument();
    expect(
      screen.queryByText(tEn('forbiddenIpfsGateway')),
    ).not.toBeInTheDocument();

    await userEvent.type(ipfsField, 'https://');

    expect(ipfsField).toHaveValue('https://');
    expect(screen.queryByText(tEn('invalidIpfsGateway'))).toBeInTheDocument();
    expect(
      screen.queryByText(tEn('forbiddenIpfsGateway')),
    ).not.toBeInTheDocument();

    await userEvent.type(ipfsField, '//');

    expect(ipfsField).toHaveValue('https:////');
    expect(screen.queryByText(tEn('invalidIpfsGateway'))).toBeInTheDocument();
    expect(
      screen.queryByText(tEn('forbiddenIpfsGateway')),
    ).not.toBeInTheDocument();

    await userEvent.clear(ipfsField);

    await userEvent.type(ipfsField, 'gateway.ipfs.io');

    expect(ipfsField).toHaveValue('gateway.ipfs.io');
    expect(
      screen.queryByText(tEn('invalidIpfsGateway')),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(tEn('forbiddenIpfsGateway'))).toBeInTheDocument();
  });

  it('toggles IPFS gateway', async () => {
    mockState.metamask.ipfsGateway = '';

    const localMockStore = configureMockStore([thunk])(mockState);
    renderWithProvider(<SecurityTab />, localMockStore);

    expect(await toggleCheckbox('ipfsToggle', false, true)).toBe(true);
    expect(await toggleCheckbox('ipfsToggle', true, true)).toBe(true);
  });

  it('toggles ENS domains in address bar', async () => {
    expect(
      await toggleCheckbox('ipfs-gateway-resolution-container', false),
    ).toBe(true);
  });

  it('clicks "Add Custom Network"', async () => {
    const user = userEvent.setup();
    renderWithProvider(<SecurityTab />, mockStore);

    // Test the default path where `getEnvironmentType() === undefined`
    await user.click(screen.getByText(tEn('addCustomNetwork')));

    // Now force it down the path where `getEnvironmentType() === ENVIRONMENT_TYPE_POPUP`
    jest
      .mocked(getEnvironmentType)
      .mockImplementationOnce(() => ENVIRONMENT_TYPE_POPUP);

    global.platform = { openExtensionInBrowser: jest.fn() };

    await user.click(screen.getByText(tEn('addCustomNetwork')));
    expect(global.platform.openExtensionInBrowser).toHaveBeenCalled();
  });
});
