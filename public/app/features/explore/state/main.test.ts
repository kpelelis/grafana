import { thunkTester } from 'test/core/thunk/thunkTester';

import { ExploreUrlState } from '@grafana/data';
import { serializeStateToUrlParam } from '@grafana/data/src/utils/url';
import { locationService } from '@grafana/runtime';
import { PanelModel } from 'app/features/dashboard/state';

import { reducerTester } from '../../../../test/core/redux/reducerTester';
import { MockDataSourceApi } from '../../../../test/mocks/datasource_srv';
import { ExploreId, ExploreItemState, ExploreState } from '../../../types';

import { exploreReducer, navigateToExplore, splitClose } from './main';

const getNavigateToExploreContext = async (openInNewWindow?: (url: string) => void) => {
  const url = '/explore';
  const panel: Partial<PanelModel> = {
    datasource: { uid: 'mocked datasource' },
    targets: [{ refId: 'A' }],
  };
  const datasource = new MockDataSourceApi(panel.datasource!.uid!);
  const get = jest.fn().mockResolvedValue(datasource);
  const getDataSourceSrv = jest.fn().mockReturnValue({ get });
  const getTimeSrv = jest.fn();
  const getExploreUrl = jest.fn().mockResolvedValue(url);

  const dispatchedActions = await thunkTester({})
    .givenThunk(navigateToExplore)
    .whenThunkIsDispatched(panel, { getDataSourceSrv, getTimeSrv, getExploreUrl, openInNewWindow });

  return {
    url,
    panel,
    get,
    getDataSourceSrv,
    getTimeSrv,
    getExploreUrl,
    dispatchedActions,
  };
};

describe('navigateToExplore', () => {
  describe('when navigateToExplore thunk is dispatched', () => {
    describe('and openInNewWindow is undefined', () => {
      it('then it should dispatch correct actions', async () => {
        const { url } = await getNavigateToExploreContext();
        expect(locationService.getLocation().pathname).toEqual(url);
      });

      it('then getDataSourceSrv should have been once', async () => {
        const { getDataSourceSrv } = await getNavigateToExploreContext();

        expect(getDataSourceSrv).toHaveBeenCalledTimes(1);
      });

      it('then getTimeSrv should have been called once', async () => {
        const { getTimeSrv } = await getNavigateToExploreContext();

        expect(getTimeSrv).toHaveBeenCalledTimes(1);
      });

      it('then getExploreUrl should have been called with correct arguments', async () => {
        const { getExploreUrl, panel, getDataSourceSrv, getTimeSrv } = await getNavigateToExploreContext();

        expect(getExploreUrl).toHaveBeenCalledTimes(1);
        expect(getExploreUrl).toHaveBeenCalledWith({
          panel,
          datasourceSrv: getDataSourceSrv(),
          timeSrv: getTimeSrv(),
        });
      });
    });

    describe('and openInNewWindow is defined', () => {
      const openInNewWindow: (url: string) => void = jest.fn();
      it('then it should dispatch no actions', async () => {
        const { dispatchedActions } = await getNavigateToExploreContext(openInNewWindow);

        expect(dispatchedActions).toEqual([]);
      });

      it('then getDataSourceSrv should have been once', async () => {
        const { getDataSourceSrv } = await getNavigateToExploreContext(openInNewWindow);

        expect(getDataSourceSrv).toHaveBeenCalledTimes(1);
      });

      it('then getTimeSrv should have been called once', async () => {
        const { getTimeSrv } = await getNavigateToExploreContext(openInNewWindow);

        expect(getTimeSrv).toHaveBeenCalledTimes(1);
      });

      it('then getExploreUrl should have been called with correct arguments', async () => {
        const { getExploreUrl, panel, getDataSourceSrv, getTimeSrv } = await getNavigateToExploreContext(
          openInNewWindow
        );

        expect(getExploreUrl).toHaveBeenCalledTimes(1);
        expect(getExploreUrl).toHaveBeenCalledWith({
          panel,
          datasourceSrv: getDataSourceSrv(),
          timeSrv: getTimeSrv(),
        });
      });

      it('then openInNewWindow should have been called with correct arguments', async () => {
        const openInNewWindowFunc = jest.fn();
        const { url } = await getNavigateToExploreContext(openInNewWindowFunc);

        expect(openInNewWindowFunc).toHaveBeenCalledTimes(1);
        expect(openInNewWindowFunc).toHaveBeenCalledWith(url);
      });
    });
  });
});

describe('Explore reducer', () => {
  describe('split view', () => {
    describe('split close', () => {
      it('should move right pane to left when left is closed', () => {
        const leftItemMock = {
          containerWidth: 100,
        } as unknown as ExploreItemState;

        const rightItemMock = {
          containerWidth: 200,
        } as unknown as ExploreItemState;

        const initialState = {
          panes: {
            left: leftItemMock,
            right: rightItemMock,
          },
        } as unknown as ExploreState;

        // closing left item
        reducerTester<ExploreState>()
          .givenReducer(exploreReducer, initialState)
          .whenActionIsDispatched(splitClose(ExploreId.left))
          .thenStateShouldEqual({
            evenSplitPanes: true,
            largerExploreId: undefined,
            panes: {
              left: rightItemMock,
            },
            maxedExploreId: undefined,
            syncedTimes: false,
          } as unknown as ExploreState);
      });
      it('should reset right pane when it is closed', () => {
        const leftItemMock = {
          containerWidth: 100,
        } as unknown as ExploreItemState;

        const rightItemMock = {
          containerWidth: 200,
        } as unknown as ExploreItemState;

        const initialState = {
          panes: {
            left: leftItemMock,
            right: rightItemMock,
          },
        } as unknown as ExploreState;

        // closing left item
        reducerTester<ExploreState>()
          .givenReducer(exploreReducer, initialState)
          .whenActionIsDispatched(splitClose(ExploreId.right))
          .thenStateShouldEqual({
            evenSplitPanes: true,
            largerExploreId: undefined,
            panes: {
              left: leftItemMock,
            },
            maxedExploreId: undefined,
            syncedTimes: false,
          } as unknown as ExploreState);
      });

      it('should unsync time ranges', () => {
        const itemMock = {
          containerWidth: 100,
        } as unknown as ExploreItemState;

        const initialState = {
          panes: {
            right: itemMock,
            left: itemMock,
          },
          syncedTimes: true,
        } as unknown as ExploreState;

        reducerTester<ExploreState>()
          .givenReducer(exploreReducer, initialState)
          .whenActionIsDispatched(splitClose(ExploreId.right))
          .thenStateShouldEqual({
            evenSplitPanes: true,
            panes: {
              left: itemMock,
            },
            syncedTimes: false,
          } as unknown as ExploreState);
      });
    });
  });
});

export const setup = (urlStateOverrides?: Partial<ExploreUrlState>) => {
  const urlStateDefaults: ExploreUrlState = {
    datasource: 'some-datasource',
    queries: [],
    range: {
      from: '',
      to: '',
    },
  };
  const urlState: ExploreUrlState = { ...urlStateDefaults, ...urlStateOverrides };
  const serializedUrlState = serializeStateToUrlParam(urlState);
  const initialState = {
    split: false,
  } as unknown as ExploreState;

  return {
    initialState,
    serializedUrlState,
  };
};
