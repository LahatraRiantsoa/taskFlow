<?php
namespace App\Security;

use Firebase\JWT\JWT;
use Firebase\JWT\JWK;
use GuzzleHttp\Client;

class SupabaseAuthService
{
    private string $supabaseUrl;
    private Client $http;

    public function __construct(string $supabaseUrl)
    {
        $this->supabaseUrl = rtrim($supabaseUrl, '/');
        $this->http = new Client();
    }

    private function getJwks(): array
    {
        $jwksUrl = $this->supabaseUrl . '/.well-known/jwks.json';
        $resp = $this->http->get($jwksUrl);
        $body = (string) $resp->getBody();
        $data = json_decode($body, true);
        return $data['keys'] ?? [];
    }

    public function validateToken(string $jwt): ?array
    {
        $jwks = $this->getJwks();
        $keys = JWK::parseKeySet(['keys' => $jwks]);
        try {
            $decoded = JWT::decode($jwt, $keys);
            // convert to array
            $claims = json_decode(json_encode($decoded), true);
            // Basic checks: exp, sub
            if (isset($claims['exp']) && $claims['exp'] < time()) {
                return null;
            }
            return $claims;
        } catch (\Throwable $e) {
            return null;
        }
    }
}
