const { deployMockContract, solidity } = require('ethereum-waffle')
const { expect, use } = require("chai");
const { ethers } = require("hardhat");
use(solidity);
let overrides = { gasLimit: 9500000 };

describe('Vesting', function() {
  let wallet1, wallet2, wallet3;
  let vesting, erc20token;

  beforeEach(async () => {
    [wallet1, wallet2, wallet3] = await ethers.getSigners();
  })

  describe('constructor()',  () => {
    beforeEach(async() => {
      const IERC20 = await hre.artifacts.readArtifact("IERC20");
      erc20token = await deployMockContract(wallet1, IERC20.abi, overrides);
    });

    it('should deploy vesting', async () => {
      const percentage = [5000, 2500, 2500];
      await erc20token.mock.balanceOf.withArgs(wallet1.address).returns(1000);
      
      const Vesting = await ethers.getContractFactory("Vesting", wallet1, overrides);
      vesting = await Vesting.deploy(
        true, // revocable
        erc20token.address, // token
        1000, // totalAmount
        1639041788, // start
        60*60, // cliff
        60*60, // duration
        1000, // slicePerDuration
        [wallet1.address, wallet2.address, wallet3.address],
        percentage
      );

      expect(await vesting.revocable()).to.equal(true);
      expect((await vesting.totalAmount()).toString()).to.equal('1000');
      expect((await vesting.getToken()).toString()).to.equal(erc20token.address);
      expect((await vesting.start()).toString()).to.equal('1639041788');
      expect((await vesting.cliff()).toString()).to.equal('3600');
      expect((await vesting.duration()).toString()).to.equal('3600');
      expect((await vesting.slicePerDuration()).toString()).to.equal('1000');
      expect(await vesting.getAddresses()).to.eql([wallet1.address, wallet2.address, wallet3.address]);
      expect((await vesting.percentage(wallet1.address)).toString()).to.equal(percentage[0].toString());
      expect((await vesting.percentage(wallet2.address)).toString()).to.equal(percentage[1].toString());
      expect((await vesting.percentage(wallet3.address)).toString()).to.equal(percentage[2].toString());
    });

    it('should revert on total amount', async () => {
      const percentage = [5000, 2500, 2500];
      await erc20token.mock.balanceOf.withArgs(wallet1.address).returns(1000);
      
      const Vesting = await ethers.getContractFactory("Vesting", wallet1, overrides);
      await expect(Vesting.deploy(
        true, // revocable
        erc20token.address, // token
        0, // totalAmount
        1639041788, // start
        60*60, // cliff
        60*60, // duration
        1000, // slicePerDuration
        [wallet1.address, wallet2.address, wallet3.address],
        percentage
      )).to.be.revertedWith('Vesting: total amount must be greater than 0.');
    });

    it('should revert on duration', async () => {
      const percentage = [5000, 2500, 2500];
      await erc20token.mock.balanceOf.withArgs(wallet1.address).returns(1000);
      
      const Vesting = await ethers.getContractFactory("Vesting", wallet1, overrides);
      await expect(Vesting.deploy(
        true, // revocable
        erc20token.address, // token
        10, // totalAmount
        1639041788, // start
        1, // cliff
        0, // duration
        1000, // slicePerDuration
        [wallet1.address, wallet2.address, wallet3.address],
        percentage
      )).to.be.revertedWith('Vesting: duration must be greater than 0.');
    });

    it('should revert on slicePerDuration', async () => {
      const percentage = [5000, 2500, 2500];
      await erc20token.mock.balanceOf.withArgs(wallet1.address).returns(1000);
      
      const Vesting = await ethers.getContractFactory("Vesting", wallet1, overrides);
      await expect(Vesting.deploy(
        true, // revocable
        erc20token.address, // token
        10, // totalAmount
        1639041788, // start
        1, // cliff
        1, // duration
        10001, // slicePerDuration
        [wallet1.address, wallet2.address, wallet3.address],
        percentage
      )).to.be.revertedWith('Vesting: slice per duration must be greater than 100 (1%) and lower/equal than 10000 (100%).');

      await expect(Vesting.deploy(
        true, // revocable
        erc20token.address, // token
        10, // totalAmount
        1639041788, // start
        1, // cliff
        1, // duration
        99, // slicePerDuration
        [wallet1.address, wallet2.address, wallet3.address],
        percentage
      )).to.be.revertedWith('Vesting: slice per duration must be greater than 100 (1%) and lower/equal than 10000 (100%).');
    });

    it('should revert on array size (addresses, percentages)', async () => {
      const percentage = [5000, 2500, 2500];
      await erc20token.mock.balanceOf.withArgs(wallet1.address).returns(1000);
      
      const Vesting = await ethers.getContractFactory("Vesting", wallet1, overrides);
      await expect(Vesting.deploy(
        true, // revocable
        erc20token.address, // token
        10, // totalAmount
        1639041788, // start
        1, // cliff
        1, // duration
        1000, // slicePerDuration
        [wallet1.address, wallet2.address],
        percentage
      )).to.be.revertedWith("Vesting: address array's and percentage array's length must be equal.");

      await expect(Vesting.deploy(
        true, // revocable
        erc20token.address, // token
        10, // totalAmount
        1639041788, // start
        1, // cliff
        1, // duration
        1000, // slicePerDuration
        [wallet1.address, wallet2.address, wallet3.address],
        [6000, 1000]
      )).to.be.revertedWith("Vesting: address array's and percentage array's length must be equal.");
    });

    it('should revert on token address', async () => {
      const percentage = [5000, 2500, 2500];
      await erc20token.mock.balanceOf.withArgs(wallet1.address).returns(1000);
      
      const Vesting = await ethers.getContractFactory("Vesting", wallet1, overrides);
      await expect(Vesting.deploy(
        true, // revocable
        ethers.constants.AddressZero, // token
        10, // totalAmount
        1639041788, // start
        1, // cliff
        1, // duration
        1000, // slicePerDuration
        [wallet1.address, wallet2.address, wallet3.address],
        percentage
      )).to.be.revertedWith('Vesting: token non-zero address.');
    });

    it('should revert on wallet address', async () => {
      const percentage = [5000, 2500, 2500];
      await erc20token.mock.balanceOf.withArgs(wallet1.address).returns(1000);
      
      const Vesting = await ethers.getContractFactory("Vesting", wallet1, overrides);
      await expect(Vesting.deploy(
        true, // revocable
        erc20token.address, // token
        10, // totalAmount
        1639041788, // start
        1, // cliff
        1, // duration
        1000, // slicePerDuration
        [wallet1.address, wallet2.address, ethers.constants.AddressZero],
        percentage
      )).to.be.revertedWith('Vesting: address into addresses_ must be non-zero address.');
    });

    it('should revert on percentage', async () => {
      let percentage = [0, 2500, 10000];
      await erc20token.mock.balanceOf.withArgs(wallet1.address).returns(1000);
      
      const Vesting = await ethers.getContractFactory("Vesting", wallet1, overrides);
      await expect(Vesting.deploy(
        true, // revocable
        erc20token.address, // token
        10, // totalAmount
        1639041788, // start
        1, // cliff
        1, // duration
        1000, // slicePerDuration
        [wallet1.address, wallet2.address, wallet3.address],
        percentage
      )).to.be.revertedWith('Vesting: percentage must be greater than 0 (0%) and lower/equal than 10000 (100%).');
      
      percentage = [1, 2500, 10001];
      await expect(Vesting.deploy(
        true, // revocable
        erc20token.address, // token
        10, // totalAmount
        1639041788, // start
        1, // cliff
        1, // duration
        1000, // slicePerDuration
        [wallet1.address, wallet2.address, wallet3.address],
        percentage
      )).to.be.revertedWith('Vesting: percentage must be greater than 0 (0%) and lower/equal than 10000 (100%).');
      
      percentage = [1, 2500, 10000];
      await expect(Vesting.deploy(
        true, // revocable
        erc20token.address, // token
        10, // totalAmount
        1639041788, // start
        1, // cliff
        1, // duration
        1000, // slicePerDuration
        [wallet1.address, wallet2.address, wallet3.address],
        percentage
      )).to.be.revertedWith('Vesting: total amount of percentages must be equal to 10000.');
    });
  });

  describe('vesting', () => {
    beforeEach(async () => {
      const percentage = [5000, 2500, 2500];
      const amount = 20000000;
      const Token = await ethers.getContractFactory("Token", wallet1, overrides);
      erc20token = await Token.deploy("TOKEN", "TKN", amount);

      const Vesting = await ethers.getContractFactory("Vesting", wallet1, overrides);
      vesting = await Vesting.deploy(
        true, // revocable
        erc20token.address, // token
        amount, // totalAmount
        1739060000, // start
        60*60*24*30*3, // cliff
        60*60*24*30, // duration
        1000, // slicePerDuration
        [wallet1.address, wallet2.address, wallet3.address],
        percentage
      );
      await erc20token.transfer(vesting.address, amount);
    });

    it('should can withdraw after revoke', async () => {
      await ethers.provider.send("evm_mine", [1739060000]);
      await vesting.revoke();
      await vesting.withdraw();
      expect((await erc20token.balanceOf(wallet1.address)).toString()).to.be.equal('20000000');
    });

    it('should release before revoke', async () => {
      await ethers.provider.send("evm_mine", [1739060000+60*60*24*30*4]);
      await expect(vesting.revoke())
      .to.emit(vesting, 'Revoked')
      .to.emit(vesting, "Released").withArgs(wallet1.address, 1000000)
      .to.emit(vesting, "Released").withArgs(wallet2.address, 500000)
      .to.emit(vesting, "Released").withArgs(wallet3.address, 500000);
      expect((await erc20token.balanceOf(wallet1.address)).toString()).to.be.equal('1000000');
      expect((await erc20token.balanceOf(wallet2.address)).toString()).to.be.equal('500000');
      expect((await erc20token.balanceOf(wallet3.address)).toString()).to.be.equal('500000');
    });

    it('should release all addresses', async () => {
      await expect(vesting.releaseAll())
      .to.emit(vesting, "Released").withArgs(wallet1.address, 1000000)
      .to.emit(vesting, "Released").withArgs(wallet2.address, 500000)
      .to.emit(vesting, "Released").withArgs(wallet3.address, 500000);
      expect((await erc20token.balanceOf(wallet1.address)).toString()).to.be.equal('1000000');
      expect((await erc20token.balanceOf(wallet2.address)).toString()).to.be.equal('500000');
      expect((await erc20token.balanceOf(wallet3.address)).toString()).to.be.equal('500000');
    });

    it('should release one address on first period and then release all addresses on second period', async () => {
      await expect(vesting.release(wallet1.address))
      .to.emit(vesting, "Released").withArgs(wallet1.address, 1000000);
      expect((await erc20token.balanceOf(wallet1.address)).toString()).to.be.equal('1000000');
      expect((await erc20token.balanceOf(wallet2.address)).toString()).to.be.equal('0');
      expect((await erc20token.balanceOf(wallet3.address)).toString()).to.be.equal('0');

      await ethers.provider.send("evm_mine", [1739060000+60*60*24*30*5]);
      
      await expect(vesting.releaseAll())
      .to.emit(vesting, "Released").withArgs(wallet1.address, 1000000)
      .to.emit(vesting, "Released").withArgs(wallet2.address, 1000000)
      .to.emit(vesting, "Released").withArgs(wallet3.address, 1000000);
      
      expect((await erc20token.balanceOf(wallet1.address)).toString()).to.be.equal('2000000');
      expect((await erc20token.balanceOf(wallet2.address)).toString()).to.be.equal('1000000');
      expect((await erc20token.balanceOf(wallet3.address)).toString()).to.be.equal('1000000');
    });
  });
});