# Vesting

This is a vesting smart contract. It is used to manage vesting for multiple addresses in one instance of the smart contract. There will be mutiple target addresses who will be associated to their slice of vesting (in %).

# Getting Started
Install `direnv` module.

We use [direnv](https://direnv.net/) to manage environment variables.  You'll likely need to install it.

```sh
cp .envrc.example .envrc
```

# Setup
```.sh
yarn
```

# Test
```.sh
yarn test
```

# Deploy
Configure parameters in [deploy/deploy.js](https://github.com/AnyRob8/vesting_tokens/blob/main/deploy/deploy.js) before deployment.
```.sh
yarn deploy <network>
```
