// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../src/ProjectFactory.sol";
import "../src/ProjectEscrow.sol";
import "../src/PositionNFT.sol";

// ─── Minimal USDT mock with 6 decimals ───────────────────────────────────────
contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

// ─── Test contract ────────────────────────────────────────────────────────────
contract ProjectFactoryTest is Test {
    MockUSDT       usdt;
    ProjectFactory factory;

    address admin   = address(0xAD);
    address creator = address(0xC1);
    address orgWallet = address(0x0123);

    string constant BASE_URI = "https://app.ember.example/";

    // 4 equal milestones: m0=25%, m1=25%, m2=25%, m3=25%
    uint16[] bps4;
    uint32   constant VOTING_PERIOD = 7 days;

    function setUp() public {
        usdt    = new MockUSDT();
        factory = new ProjectFactory(address(usdt), admin, BASE_URI);

        bps4 = new uint16[](4);
        bps4[0] = 2500; bps4[1] = 2500; bps4[2] = 2500; bps4[3] = 2500;
    }

    // ─── Helper ──────────────────────────────────────────────────────────────

    function _create() internal returns (uint256 projectId, address escrowAddr, address nftAddr) {
        vm.prank(creator);
        (projectId, escrowAddr, nftAddr) = factory.createProject(
            orgWallet,
            bps4,
            VOTING_PERIOD,
            "ipfs://QmProjectURI"
        );
    }

    // ─── Tests ───────────────────────────────────────────────────────────────

    // 1. Deploys non-zero escrow and nft addresses; contracts are properly wired
    function test_createProject_DeploysEscrowAndNFT() public {
        (, address escrowAddr, address nftAddr) = _create();

        assertTrue(escrowAddr != address(0), "escrow address must be non-zero");
        assertTrue(nftAddr    != address(0), "nft address must be non-zero");

        // Escrow holds the correct usdt and nft addresses
        ProjectEscrow escrow = ProjectEscrow(escrowAddr);
        assertEq(address(escrow.usdt()), address(usdt), "escrow.usdt mismatch");
        assertEq(address(escrow.nft()),  nftAddr,       "escrow.nft mismatch");
        assertEq(escrow.organizationWallet(), orgWallet, "escrow.organizationWallet mismatch");
        assertEq(uint32(escrow.votingPeriod()), VOTING_PERIOD, "escrow.votingPeriod mismatch");

        // NFT escrow is wired correctly
        PositionNFT nft = PositionNFT(nftAddr);
        assertEq(nft.escrow(), escrowAddr, "nft.escrow mismatch");
    }

    // 2. Returns correct projectId (starts at 0)
    function test_createProject_ReturnsProjectIdZero() public {
        (uint256 projectId,,) = _create();
        assertEq(projectId, 0, "first project should have id 0");
    }

    // 3. Emits ProjectCreated with correct payload
    function test_createProject_EmitsProjectCreated() public {
        // We need to predict escrow + nft addresses — use vm.expectEmit with partial check
        // on non-indexed fields. We'll capture the emitted event differently:
        // emit is checked after the call by using recordLogs.
        vm.recordLogs();

        vm.prank(creator);
        (uint256 projectId, address escrowAddr, address nftAddr) = factory.createProject(
            orgWallet,
            bps4,
            VOTING_PERIOD,
            "ipfs://QmProjectURI"
        );

        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertGt(logs.length, 0, "expected at least one log");

        // ProjectCreated(uint256 indexed projectId, address indexed organization,
        //                address indexed creator, address escrow, address nft,
        //                uint16[] milestoneBps, uint32 votingPeriod)
        // topic[0] = keccak256 of event sig
        // topic[1] = projectId
        // topic[2] = organization
        // topic[3] = creator

        bytes32 expectedSig = keccak256(
            "ProjectCreated(uint256,address,address,address,address,uint16[],uint32)"
        );

        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == expectedSig) {
                found = true;

                // Verify indexed fields
                assertEq(uint256(logs[i].topics[1]), projectId,               "topic: projectId");
                assertEq(address(uint160(uint256(logs[i].topics[2]))), orgWallet, "topic: organization");
                assertEq(address(uint160(uint256(logs[i].topics[3]))), creator,   "topic: creator");

                // Decode non-indexed fields: (address escrow, address nft, uint16[], uint32)
                (address logEscrow, address logNft,,) =
                    abi.decode(logs[i].data, (address, address, uint16[], uint32));

                assertEq(logEscrow, escrowAddr, "event: escrow address");
                assertEq(logNft,    nftAddr,    "event: nft address");
                break;
            }
        }
        assertTrue(found, "ProjectCreated event not found");
    }

    // 4. Incrementing project IDs: two projects get IDs 0 and 1
    function test_createProject_IncrementingProjectIds() public {
        (uint256 id0,,) = _create();

        vm.prank(creator);
        (uint256 id1,,) = factory.createProject(
            orgWallet,
            bps4,
            VOTING_PERIOD,
            "ipfs://QmProject2"
        );

        assertEq(id0, 0, "first project id should be 0");
        assertEq(id1, 1, "second project id should be 1");
        assertEq(factory.projectCount(), 2, "projectCount should be 2");
    }

    // 5. Reverts with InvalidBps when sum != 10000
    function test_createProject_ValidatesBpsSumNot10000() public {
        uint16[] memory bad = new uint16[](4);
        bad[0] = 2500; bad[1] = 2500; bad[2] = 2500; bad[3] = 2400; // sum = 9900

        vm.prank(creator);
        vm.expectRevert(ProjectFactory.InvalidBps.selector);
        factory.createProject(orgWallet, bad, VOTING_PERIOD, "ipfs://Q");
    }

    // 6. Reverts with InvalidBps when length < 2
    function test_createProject_ValidatesBpsLengthTooShort() public {
        uint16[] memory bad = new uint16[](1);
        bad[0] = 10000;

        vm.prank(creator);
        vm.expectRevert(ProjectFactory.InvalidBps.selector);
        factory.createProject(orgWallet, bad, VOTING_PERIOD, "ipfs://Q");
    }

    // 7. Reverts with InvalidBps when length > 20
    function test_createProject_ValidatesBpsLengthTooLong() public {
        uint16[] memory bad = new uint16[](21);
        // Spread 10000 across 20 entries, leave last as 0 — but length is 21
        for (uint256 i = 0; i < 20; i++) bad[i] = 500;
        bad[20] = 0;
        // sum of first 20 = 10000, length = 21 > 20

        vm.prank(creator);
        vm.expectRevert(ProjectFactory.InvalidBps.selector);
        factory.createProject(orgWallet, bad, VOTING_PERIOD, "ipfs://Q");
    }

    // 8. Reverts with InvalidVotingPeriod when votingPeriod < 3 days
    function test_createProject_ValidatesVotingPeriodTooShort() public {
        uint32 tooShort = uint32(3 days) - 1;

        vm.prank(creator);
        vm.expectRevert(ProjectFactory.InvalidVotingPeriod.selector);
        factory.createProject(orgWallet, bps4, tooShort, "ipfs://Q");
    }

    // 9. Reverts with InvalidVotingPeriod when votingPeriod > 30 days
    function test_createProject_ValidatesVotingPeriodTooLong() public {
        uint32 tooLong = uint32(30 days) + 1;

        vm.prank(creator);
        vm.expectRevert(ProjectFactory.InvalidVotingPeriod.selector);
        factory.createProject(orgWallet, bps4, tooLong, "ipfs://Q");
    }

    // 10. Reverts with ZeroAddress for zero organizationWallet
    function test_createProject_ValidatesZeroOrgWallet() public {
        vm.prank(creator);
        vm.expectRevert(ProjectFactory.ZeroAddress.selector);
        factory.createProject(address(0), bps4, VOTING_PERIOD, "ipfs://Q");
    }

    // 11. Factory constructor reverts with ZeroAddress for zero usdt
    function test_constructor_RevertsOnZeroUsdt() public {
        vm.expectRevert(ProjectFactory.ZeroAddress.selector);
        new ProjectFactory(address(0), admin, BASE_URI);
    }

    // 12. Factory constructor reverts with ZeroAddress for zero admin
    function test_constructor_RevertsOnZeroAdmin() public {
        vm.expectRevert(ProjectFactory.ZeroAddress.selector);
        new ProjectFactory(address(usdt), address(0), BASE_URI);
    }

    // 13. Boundary: exactly 3 days voting period is accepted
    function test_createProject_AcceptsMinVotingPeriod() public {
        uint32 minPeriod = uint32(3 days);
        vm.prank(creator);
        (uint256 projectId,,) = factory.createProject(orgWallet, bps4, minPeriod, "ipfs://Q");
        assertEq(projectId, 0, "should succeed at minimum voting period");
    }

    // 14. Boundary: exactly 30 days voting period is accepted
    function test_createProject_AcceptsMaxVotingPeriod() public {
        uint32 maxPeriod = uint32(30 days);
        vm.prank(creator);
        (uint256 projectId,,) = factory.createProject(orgWallet, bps4, maxPeriod, "ipfs://Q");
        assertEq(projectId, 0, "should succeed at maximum voting period");
    }

    // 15. Boundary: 2 milestones (minimum allowed) is accepted
    function test_createProject_AcceptsMinMilestoneCount() public {
        uint16[] memory twoMilestones = new uint16[](2);
        twoMilestones[0] = 5000; twoMilestones[1] = 5000;

        vm.prank(creator);
        (uint256 projectId,,) = factory.createProject(orgWallet, twoMilestones, VOTING_PERIOD, "ipfs://Q");
        assertEq(projectId, 0, "should succeed with 2 milestones");
    }

    // 16. Boundary: 20 milestones (maximum allowed) is accepted
    function test_createProject_AcceptsMaxMilestoneCount() public {
        uint16[] memory twentyMilestones = new uint16[](20);
        for (uint256 i = 0; i < 20; i++) twentyMilestones[i] = 500; // 20 * 500 = 10000

        vm.prank(creator);
        (uint256 projectId,,) = factory.createProject(orgWallet, twentyMilestones, VOTING_PERIOD, "ipfs://Q");
        assertEq(projectId, 0, "should succeed with 20 milestones");
    }
}
