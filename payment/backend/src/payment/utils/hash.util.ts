import * as crypto from 'crypto';

export enum VpcSecureHashType {
  MD5 = 'MD5',
  SHA256 = 'SHA256'
}

export class MigsHashUtil {
  /**
   * Generate MIGS secure hash - works for most MIGS implementations
   */
  public static generateSecureHash(
    parameters: Record<string, string | null>,
    vpcSecureSecret: string,
    hashType: VpcSecureHashType
  ): string {
    
    // Filter out vpc_SecureHash and empty values, then sort alphabetically
    const filteredParams: Record<string, string> = {};
    
    Object.keys(parameters).forEach(key => {
      const value = parameters[key];
      if (key !== 'vpc_SecureHash' && key !== 'vpc_SecureHashType' && value !== null && value !== undefined && value.trim().length > 0) {
        filteredParams[key] = value.trim();
      }
    });
    
    const sortedKeys = Object.keys(filteredParams).sort();
    
    if (hashType === VpcSecureHashType.MD5) {
      // MD5: secret + concatenated values (no separators)
      const valueString = sortedKeys.map(key => filteredParams[key]).join('');
      const inputString = vpcSecureSecret + valueString;
      
      return crypto
        .createHash('md5')
        .update(inputString, 'utf8')
        .digest('hex')
        .toUpperCase();
    }
    
    if (hashType === VpcSecureHashType.SHA256) {
      // SHA256: HMAC with hex-decoded secret key (most common MIGS implementation)
      const queryString = sortedKeys.map(key => `${key}=${filteredParams[key]}`).join('&');
      
      // Decode secret from hex to bytes
      const secretBytes = Buffer.from(vpcSecureSecret, 'hex');
      
      return crypto
        .createHmac('sha256', secretBytes)
        .update(queryString, 'utf8')
        .digest('hex')
        .toUpperCase();
    }
    
    throw new Error(`Unsupported hash type: ${hashType}`);
  }
  
  /**
   * Verify secure hash from MIGS response
   */
  public static verifySecureHash(
    parameters: Record<string, string | null>,
    vpcSecureSecret: string,
    hashType: VpcSecureHashType = VpcSecureHashType.SHA256
  ): boolean {
    const providedHash = parameters.vpc_SecureHash;
    if (!providedHash){
      console.log(`Not Provided hash Value!!`)
      return false;
    }
    const calculatedHash = this.generateSecureHash(parameters, vpcSecureSecret, hashType);
    return calculatedHash === providedHash;
  }
}