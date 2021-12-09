//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title Vesting
 */

contract Vesting is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // Events
    event Released(
        address holder, 
        uint256 amount
    );
    event Revoked();

    // address of the ERC20 token
    IERC20 immutable private _token;

    // Vesting parameters

    // Total amount of token to be vested
    uint256 public totalAmount; 
    // start time of the vesting period 
    uint256 public start;
    // cliff period in seconds
    uint256 public cliff;
    // duration of the vesting period in seconds
    uint256 public duration;
    // duration of a slice per duration
    uint256 public slicePerDuration;
    // beneficiaries of tokens after they are released
    address[] public addresses;
    // percentage of each beneficiary 
    mapping(address => uint256) public percentage;
    // amount of tokens released for each address
    mapping(address => uint256) public released;
    // whether or not the vesting has been revoked
    bool public revoked;
    // whether or not the vesting is revocable
    bool public revocable;

    /**
     * @dev Creates the vesting contract.
     * @param token_ address of the ERC20 token contract
     * @param revocable_ whether or not vesting is revocable
     * @param totalAmount_ total amount of token to be vested
     * @param start_ start time of the vesting period 
     * @param cliff_ cliff period in seconds
     * @param duration_ duration of the vesting period in seconds
     * @param slicePerDuration_ duration of a slice per duration
     * @param addresses_ beneficiaries of tokens after they are released
     * @param percentage_ percentage of each beneficiary 
     */
    constructor(
        bool revocable_,
        address token_,
        uint256 totalAmount_, 
        uint256 start_,
        uint256 cliff_, 
        uint256 duration_, 
        uint256 slicePerDuration_,
        address[] memory addresses_, 
        uint256[] memory percentage_
        ) {
        require(token_ != address(0x0), "Vesting: token non-zero address.");
        require(totalAmount_ > 0, "Vesting: total amount must be greater than 0.");
        require(duration_ > 0, "Vesting: duration must be greater than 0.");
        require(slicePerDuration_ > 100 && slicePerDuration_ <= 10000, "Vesting: slice per duration must be greater than 100 (1%) and lower/equal than 10000 (100%).");
        require(addresses_.length == percentage_.length, "Vesting: address array's and percentage array's length must be equal.");
        _token = IERC20(token_);
        totalAmount = totalAmount_;
        require(IERC20(token_).balanceOf(msg.sender) >= totalAmount, "Vesting: msg sender insuficient balance.");
        cliff = cliff_;
        duration = duration_;
        slicePerDuration = slicePerDuration_;
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < addresses_.length; i++) {
            require(addresses_[i] != address(0x0), "Vesting: address into addresses_ must be non-zero address.");
            require(percentage_[i] > 0 && percentage_[i] <= 10000, "Vesting: percentage must be greater than 0 (0%) and lower/equal than 10000 (100%).");
            percentage[addresses_[i]] = percentage_[i];
            totalPercentage = totalPercentage + percentage_[i];
        }
        require(totalPercentage == 10000, "Vesting: total amount of percentages must be equal to 10000.");
        addresses = addresses_;
        revocable = revocable_;
        revoked = false;
        start = start_;
    }
    
    /**
     * @notice Revokes the vesting schedule.
     */
    function revoke() 
        public
        onlyOwner
        _onlyIfNotRevoked {
        require(revocable == true, "Vesting: vesting is not revocable.");
        uint256 releasable = computeReleasableAmount();
        if (releasable > 0) {
            for (uint256 i = 0; i < addresses.length; i++) {
                release(addresses[i]);
            }
        }
        revoked = true;
        emit Revoked();
    }

    /**
    * @notice Withdraw all tokens if the vesting is revoked.
    */
    function withdraw() 
        public
        onlyOwner {
        
        require(revoked == true, "Vesting: cannot withdraw funds if not revoked.");
        uint256 totalBalance = _token.balanceOf(address(this));
        if (totalBalance > 0)
            _token.safeTransfer(owner(), totalBalance);
    }

    /**
    * @notice Release all amount of tokens for given reciever.
    * @param reciever the address of the reciever.
    */
    function release(address reciever) 
        public
        nonReentrant
    {
        uint256 releasable = computeAddressReleasable(reciever);
        if (releasable > 0)  {
            _token.safeTransfer(reciever, releasable);
            released[reciever] = released[reciever].add(releasable);
            emit Released(reciever, releasable);
        }

    }

    /**
    * @notice Release all amount of tokens for all recievers.
    */
    function releaseAll() 
        public 
    {
        for (uint256 i = 0; i < addresses.length; i++) {
            release(addresses[i]);
        }
    }

    /*******************/
    /**** COMPUTERS ****/
    /*******************/
    

    /**
     * @notice Computes the vested amount of tokens.
     * @return uint256 the amount of vested tokens
     */
    function computeReleasableAmount() 
        public
        view
        returns (uint256) {

        if (getCurrentTime() < start) {
            return 0;
        } else if (getCurrentTime() < start + cliff) {
            return 0;
        } else {
            uint256 difference = getCurrentTime() - start - cliff;
            uint256 rest = difference.mod(duration);
            difference = difference.sub(rest);
            uint256 periods = difference.div(duration);
            uint256 slice = periods.mul(slicePerDuration);
            if (slice > 10000) 
                slice = 10000;
            uint256 releasableAmount = slice.mul(totalAmount).div(10000);
            return releasableAmount;
        }
    }

    /**
     * @notice Computes the releasable amount of tokens for given address (reciver).
     * @param reciever address's for computation
     * @return uint256 amount of releasable amount of tokens.
     */
    function computeAddressReleasable(address reciever)
        public
        view
        returns (uint256) {

        require(reciever != address(0x0), "Vesting: reciever must be non-zero address.");
        require(percentage[reciever] > 0, "Vesting: reciever must have some percentage.");
        uint256 recieverReleased = released[reciever];
        uint256 recieverPercentage = percentage[reciever];
        
        uint256 releasableAmount = computeReleasableAmount();
        if (releasableAmount > 0) {
            releasableAmount = releasableAmount.mul(recieverPercentage).div(10000);
            releasableAmount = releasableAmount.sub(recieverReleased);
            return releasableAmount;
        } else 
            return 0;
    }

    /*****************/
    /**** GETTERS ****/
    /*****************/
    
    /**
    * @dev Returns the address of the ERC20 token managed by the vesting contract.
    */
    function getToken()
        external
        view
        returns(address) {

        return address(_token);
    }
    /**
    * @dev Returns addresses that are particiapting in the vesting.
    */
    function getAddresses()
        external
        view
        returns(address[] memory) {
        return addresses;
    }

    /**
    * @dev Returns addresses that are particiapting in the vesting with associated percentage.
    */
    function getPercentages() 
        external
        view 
        returns(address[] memory, uint256[] memory)   {
        
        uint256[] memory percentage_ = new uint256[](addresses.length);
        for (uint256 i = 0; i < addresses.length; i++) {
            percentage_[i] = percentage[addresses[i]];
        }
        return (addresses, percentage_);
    }
    /*******************/
    /**** MODIFIERS ****/
    /*******************/

    modifier _onlyIfNotRevoked() {
        require(revoked == false, "Vesting: vesting is revoked.");
        _;
    }

    function getCurrentTime()
        internal
        virtual
        view
        returns(uint256){
        return block.timestamp;
    }
}
