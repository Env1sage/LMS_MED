import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from '@node-saml/passport-saml';
import { ConfigService } from '@nestjs/config';

/**
 * Shibboleth SAML SSO Strategy
 * Maps institutional IDP attributes to Bitflow LMS roles.
 *
 * Only activates when SAML_IDP_CERT env var is configured.
 * Expected SAML Attributes from IDP:
 *   - eduPersonPrincipalName  → email
 *   - displayName / cn        → fullName
 *   - eduPersonAffiliation    → role mapping
 *   - schacHomeOrganization   → institution domain → collegeId lookup
 */
@Injectable()
export class SamlStrategy extends PassportStrategy(Strategy, 'saml') {
  private readonly logger = new Logger(SamlStrategy.name);

  constructor(private configService: ConfigService) {
    // Use a placeholder cert if none provided to prevent crash during init
    const idpCert = configService.get<string>('SAML_IDP_CERT') || 'PLACEHOLDER_CERT_SSO_NOT_CONFIGURED';
    
    const config = {
      callbackUrl:
        configService.get<string>('SAML_CALLBACK_URL') ||
        'http://localhost:3001/api/auth/sso/callback',
      entryPoint:
        configService.get<string>('SAML_ENTRY_POINT') ||
        'https://idp.example.edu/idp/profile/SAML2/Redirect/SSO',
      issuer:
        configService.get<string>('SAML_ISSUER') || 'bitflow-lms-sp',
      idpCert: idpCert,
      acceptedClockSkewMs: 300_000,
      wantAssertionsSigned: false,
    };

    // PassportStrategy with @node-saml/passport-saml requires (config, verify) args
    super(
      config as any,
      ((profile: any, done: any) => {
        // This is used by passport-saml, but @nestjs/passport also calls validate()
        return done(null, profile);
      }) as any,
    );

    if (idpCert === 'PLACEHOLDER_CERT_SSO_NOT_CONFIGURED') {
      this.logger.warn('SAML SSO is not configured — set SAML_IDP_CERT, SAML_ENTRY_POINT env vars to enable');
    } else {
      this.logger.log('SAML SSO strategy initialized');
    }
  }

  /**
   * Called after SAML assertion is validated.
   * Maps IDP attributes to our user profile shape.
   */
  validate(profile: any, done: (err: any, user?: any) => void): void {
    this.logger.log(`SAML assertion received for: ${profile?.nameID}`);

    const attrs = (profile as any) || {};

    // Extract attributes – different IDPs use different claim names
    const email =
      attrs['urn:oid:1.3.6.1.4.1.5923.1.1.1.6'] || // eduPersonPrincipalName
      attrs['eduPersonPrincipalName'] ||
      attrs['email'] ||
      attrs['mail'] ||
      profile?.nameID ||
      '';

    const fullName =
      attrs['urn:oid:2.16.840.1.113730.3.1.241'] || // displayName
      attrs['displayName'] ||
      attrs['cn'] ||
      attrs['commonName'] ||
      email.split('@')[0] ||
      'Unknown User';

    // Affiliation → role mapping
    const affiliation = (
      attrs['urn:oid:1.3.6.1.4.1.5923.1.1.1.1'] || // eduPersonAffiliation
      attrs['eduPersonAffiliation'] ||
      ''
    )
      .toString()
      .toLowerCase();

    // Institution domain for tenant mapping
    const institution =
      attrs['urn:oid:1.3.6.1.4.1.25178.1.2.9'] || // schacHomeOrganization
      attrs['schacHomeOrganization'] ||
      (typeof email === 'string' ? email.split('@')[1] : '') ||
      '';

    // Map affiliation to Bitflow role
    let role = 'STUDENT';
    if (
      affiliation.includes('staff') ||
      affiliation.includes('employee') ||
      affiliation.includes('faculty')
    ) {
      role = 'FACULTY';
    }
    if (affiliation.includes('admin') || affiliation.includes('manager')) {
      role = 'COLLEGE_ADMIN';
    }

    const samlUser = {
      email: typeof email === 'string' ? email : String(email),
      fullName: typeof fullName === 'string' ? fullName : String(fullName),
      role,
      institution: typeof institution === 'string' ? institution : String(institution),
      nameID: profile?.nameID,
      nameIDFormat: profile?.nameIDFormat,
      sessionIndex: (profile as any)?.sessionIndex,
    };

    this.logger.log(
      `Mapped SAML user: ${samlUser.email} → ${samlUser.role} @ ${samlUser.institution}`,
    );

    return done(null, samlUser);
  }
}
