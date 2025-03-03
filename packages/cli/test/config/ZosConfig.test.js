'use strict';
require('../setup');

import sinon from 'sinon';
import path from 'path';
import { FileSystem } from 'zos-lib';

import { cleanupfn } from '../helpers/cleanup';
import ZosConfig from '../../src/models/config/ZosConfig';

describe('ZosConfig', function() {
  const tmpDir = 'test/tmp';
  const contractsDir = `${tmpDir}/contracts`;
  const zosConfigFile = `${tmpDir}/networks.js`;
  const zosConfigDir = `${process.cwd()}/${tmpDir}`;
  const zosConfigPath = `${process.cwd()}/${zosConfigFile}`;

  beforeEach('create tmp dir', function() {
    FileSystem.createDir(tmpDir);
  });

  afterEach('cleanup files and folders', cleanupfn(tmpDir));

  describe('methods', function() {
    describe('#initialize', function() {
      it('creates an empty contracts folder if missing', function() {
        ZosConfig.initialize(tmpDir);

        FileSystem.exists(contractsDir).should.be.true;
        FileSystem.readDir(contractsDir).should.have.lengthOf(1);
        FileSystem.readDir(contractsDir).should.include('.gitkeep');
      });

      it('does not create an empty contracts folder if present', function() {
        FileSystem.createDir(contractsDir);
        FileSystem.write(`${contractsDir}/Sample.sol`);
        ZosConfig.initialize(tmpDir);

        FileSystem.exists(contractsDir).should.be.true;
        FileSystem.readDir(contractsDir).should.have.lengthOf(1);
        FileSystem.readDir(contractsDir).should.include('Sample.sol');
      });

      it('creates a networks.js file if missing', function() {
        ZosConfig.initialize(tmpDir);

        FileSystem.exists(zosConfigPath).should.be.true;
      });

      it('does not create a networks.js file if present', function() {
        FileSystem.write(zosConfigFile , '');
        ZosConfig.initialize(tmpDir);

        FileSystem.read(zosConfigPath).should.have.lengthOf(0);
      });
    });

    describe('#exists', function() {
      context('when the networks.js file does not exist', function() {
        it('returns false', function() {
          ZosConfig.exists(tmpDir).should.eq(false);
        });
      });

      context('when the networks.js file exists', function() {
        it('returns true', function() {
          ZosConfig.initialize(tmpDir);
          ZosConfig.exists(tmpDir).should.eq(true);
        });
      });
    });

    describe('#getConfig', function() {
      it('setups the config', function() {
        ZosConfig.initialize(tmpDir);
        const config = ZosConfig.getConfig(zosConfigDir);

        config.should.have.all.keys('networks', 'compilers', 'buildDir');
        config.should.not.have.key('network');
        config.buildDir.should.eq(
          path.resolve(process.cwd(), tmpDir, 'build/contracts'),
        );
      });
    });

    describe('#loadNetworkConfig', function() {
      context('when provided network does not exist', function() {
        it('throws an error', function() {
          ZosConfig.initialize(tmpDir);
          (() => ZosConfig.loadNetworkConfig('non-existent', zosConfigDir))
            .should.throw(/is not defined in your networks.js file/);
        });
      });

      context('when the network exists', function() {
        it('setups the current selected network config', function() {
          ZosConfig.initialize(tmpDir);
          const config = ZosConfig.getConfig(zosConfigDir);
          const networkConfig = ZosConfig.loadNetworkConfig(
            'development',
            zosConfigDir,
          );

          networkConfig.provider.should.eq('http://localhost:8545');
          networkConfig.artifactDefaults.should.include({
            gas: 5000000,
            gasPrice: 5000000000,
          });
          networkConfig.should.deep.include(config);
        });

        context('when specifying a diferent provider', function() {
          afterEach('stubs config', function() {
            sinon.restore();
          });

          context('when specifying a function as provider', function() {
            it('calls the function', function() {
              const provider = () => 'returned provider';
              sinon.stub(ZosConfig, 'getConfig').returns({ networks: { local: { provider, host: 'localhost', port: '1324' } } });
              ZosConfig.initialize(tmpDir);
              const networkConfig = ZosConfig.loadNetworkConfig('local', zosConfigDir);
              networkConfig.provider.should.eq('returned provider');
            });
          });

          context('when specifying a different protocol', function() {
            it('setups a different provider', function() {
              sinon.stub(ZosConfig, 'getConfig').returns({ networks: { local: { protocol: 'wss', host: 'localhost', port: '1324' } } });
              ZosConfig.initialize(tmpDir);
              const networkConfig = ZosConfig.loadNetworkConfig('local', zosConfigDir);
              networkConfig.provider.should.eq('wss://localhost:1324');
            });
          });
        });
      });
    });
  });
});
