declare module "*.json" {
  const value: {
    address: string;
    abi: any[];
    network: string;
    deployedAt: string;
  };
  export default value;
} 