
window.onload = function() {
  // Build a system
  var url = window.location.search.match(/url=([^&]+)/);
  if (url && url.length > 1) {
    url = decodeURIComponent(url[1]);
  } else {
    url = window.location.origin;
  }
  var options = {
  "swaggerDoc": {
    "openapi": "3.0.0",
    "info": {
      "title": "FIFA World Cup 2026 API",
      "version": "1.0.4",
      "description": "Complete REST API for FIFA World Cup 2026 - United States, Mexico & Canada",
      "contact": {
        "name": "API Support",
        "email": "support@worldcup2026.com"
      },
      "license": {
        "name": "ISC",
        "url": "https://opensource.org/licenses/ISC"
      }
    },
    "servers": [
      {
        "url": "http://localhost:3050",
        "description": "Development server"
      },
      {
        "url": "http://worldcup26.ir:3050",
        "description": "Production server"
      },
      {
        "url": "https://worldcup26.ir",
        "description": "Production server (HTTPS)"
      }
    ],
    "components": {
      "securitySchemes": {
        "bearerAuth": {
          "type": "http",
          "scheme": "bearer",
          "bearerFormat": "JWT",
          "description": "Enter JWT token"
        }
      },
      "schemas": {
        "User": {
          "type": "object",
          "required": [
            "name",
            "email",
            "password"
          ],
          "properties": {
            "name": {
              "type": "string",
              "description": "User full name"
            },
            "email": {
              "type": "string",
              "format": "email",
              "description": "User email address"
            },
            "password": {
              "type": "string",
              "format": "password",
              "description": "User password (min 6 characters)"
            }
          }
        },
        "Group": {
          "type": "object",
          "properties": {
            "_id": {
              "type": "string",
              "description": "Group ID"
            },
            "name": {
              "type": "string",
              "description": "Group name (A-L)"
            },
            "winner": {
              "type": "string",
              "description": "Winner team"
            },
            "runnerUp": {
              "type": "string",
              "description": "Runner-up team"
            }
          }
        },
        "Team": {
          "type": "object",
          "properties": {
            "_id": {
              "type": "string",
              "description": "Team ID"
            },
            "name": {
              "type": "string",
              "description": "Team name"
            },
            "flag": {
              "type": "string",
              "description": "Team flag URL"
            },
            "group": {
              "type": "string",
              "description": "Group reference ID"
            },
            "games": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "description": "Array of game IDs"
            }
          }
        },
        "Game": {
          "type": "object",
          "properties": {
            "_id": {
              "type": "string",
              "description": "MongoDB document ID"
            },
            "id": {
              "type": "string",
              "description": "Public match ID (1-104)"
            },
            "home_team_id": {
              "type": "string",
              "description": "Home team public ID"
            },
            "away_team_id": {
              "type": "string",
              "description": "Away team public ID"
            },
            "home_score": {
              "type": "string",
              "description": "Home team score"
            },
            "away_score": {
              "type": "string",
              "description": "Away team score"
            },
            "home_scorers": {
              "type": "string",
              "description": "Home team scorers list or null string"
            },
            "away_scorers": {
              "type": "string",
              "description": "Away team scorers list or null string"
            },
            "group": {
              "type": "string",
              "description": "Group/stage code (A-L, R32, R16, QF, SF, 3RD, FINAL)"
            },
            "matchday": {
              "type": "string",
              "description": "Matchday number as string"
            },
            "local_date": {
              "type": "string",
              "description": "Local date in MM/DD/YYYY HH:mm format"
            },
            "persian_date": {
              "type": "string",
              "description": "Persian calendar date/time"
            },
            "stadium_id": {
              "type": "string",
              "description": "Stadium public ID"
            },
            "date": {
              "type": "string",
              "format": "date-time",
              "description": "Parsed game date/time (ISO)"
            },
            "finished": {
              "type": "string",
              "description": "Match finished status (e.g. FALSE/TRUE)"
            },
            "time_elapsed": {
              "type": "string",
              "description": "Match clock status (e.g. notstarted, 45, HT, FT)"
            },
            "type": {
              "type": "string",
              "description": "Tournament stage type (group, r32, r16, qf, sf, third, final)"
            },
            "home_team_label": {
              "type": "string",
              "description": "Placeholder label for knockout home side"
            },
            "away_team_label": {
              "type": "string",
              "description": "Placeholder label for knockout away side"
            },
            "homeTeam": {
              "type": "string",
              "description": "Internal MongoDB ObjectId reference to home team"
            },
            "visitingTeam": {
              "type": "string",
              "description": "Internal MongoDB ObjectId reference to away team"
            },
            "createdAt": {
              "type": "string",
              "format": "date-time",
              "description": "Creation timestamp"
            }
          }
        },
        "MatchTable": {
          "type": "object",
          "properties": {
            "_id": {
              "type": "string",
              "description": "Match table ID"
            },
            "group": {
              "type": "string",
              "description": "Group name (A-L)"
            },
            "teams": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "team_id": {
                    "type": "string",
                    "description": "Team ID"
                  },
                  "mp": {
                    "type": "number",
                    "description": "Matches played"
                  },
                  "w": {
                    "type": "number",
                    "description": "Wins"
                  },
                  "d": {
                    "type": "number",
                    "description": "Draws"
                  },
                  "l": {
                    "type": "number",
                    "description": "Losses"
                  },
                  "gf": {
                    "type": "number",
                    "description": "Goals for"
                  },
                  "ga": {
                    "type": "number",
                    "description": "Goals against"
                  },
                  "gd": {
                    "type": "number",
                    "description": "Goal difference"
                  },
                  "pts": {
                    "type": "number",
                    "description": "Points"
                  }
                }
              }
            }
          }
        },
        "Error": {
          "type": "object",
          "properties": {
            "error": {
              "type": "string",
              "description": "Error message"
            }
          }
        }
      }
    },
    "security": [
      {
        "bearerAuth": []
      }
    ],
    "paths": {
      "/auth/register": {
        "post": {
          "summary": "Register a new user",
          "description": "Create a new user account",
          "tags": [
            "Authentication"
          ],
          "security": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "name",
                    "email",
                    "password"
                  ],
                  "properties": {
                    "name": {
                      "type": "string",
                      "example": "John Doe"
                    },
                    "email": {
                      "type": "string",
                      "format": "email",
                      "example": "john@example.com"
                    },
                    "password": {
                      "type": "string",
                      "format": "password",
                      "example": "password123"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "User registered successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "user": {
                        "$ref": "#/components/schemas/User"
                      },
                      "token": {
                        "type": "string",
                        "description": "JWT authentication token"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "User already exists or registration failed",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            }
          }
        }
      },
      "/auth/authenticate": {
        "post": {
          "summary": "Login user",
          "description": "Authenticate user with email and password",
          "tags": [
            "Authentication"
          ],
          "security": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "email",
                    "password"
                  ],
                  "properties": {
                    "email": {
                      "type": "string",
                      "format": "email",
                      "example": "john@example.com"
                    },
                    "password": {
                      "type": "string",
                      "format": "password",
                      "example": "password123"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Login successful",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "user": {
                        "$ref": "#/components/schemas/User"
                      },
                      "token": {
                        "type": "string",
                        "description": "JWT authentication token"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "User not found or invalid password",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            }
          }
        }
      },
      "/donate/create": {
        "post": {
          "summary": "Create a new crypto donation",
          "description": "Creates a payment via NOWPayments gateway. Users can donate 1-100 USD using USDT (TRC20).",
          "tags": [
            "Donation"
          ],
          "security": [],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "amount"
                  ],
                  "properties": {
                    "amount": {
                      "type": "number",
                      "minimum": 10,
                      "maximum": 100,
                      "description": "Donation amount in USD",
                      "example": 10
                    },
                    "donor_name": {
                      "type": "string",
                      "description": "Donor name (optional)",
                      "example": "John Doe"
                    },
                    "donor_email": {
                      "type": "string",
                      "format": "email",
                      "description": "Donor email (optional)"
                    },
                    "message": {
                      "type": "string",
                      "description": "Donor message (optional)"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Payment created successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "success": {
                        "type": "boolean"
                      },
                      "payment_id": {
                        "type": "string"
                      },
                      "pay_address": {
                        "type": "string",
                        "description": "Wallet address to send USDT to"
                      },
                      "pay_amount": {
                        "type": "number"
                      },
                      "pay_currency": {
                        "type": "string"
                      },
                      "order_id": {
                        "type": "string"
                      },
                      "expires_at": {
                        "type": "string"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid amount (must be 1-100 USD)"
            },
            "500": {
              "description": "Payment gateway error"
            }
          }
        }
      },
      "/donate/ipn": {
        "post": {
          "summary": "IPN Callback from NOWPayments",
          "description": "Receives payment status updates from NOWPayments. Do not call this endpoint manually.",
          "tags": [
            "Donation"
          ],
          "security": [],
          "responses": {
            "200": {
              "description": "IPN processed successfully"
            },
            "400": {
              "description": "Invalid signature"
            },
            "404": {
              "description": "Donation not found"
            }
          }
        }
      },
      "/donate/status/{orderId}": {
        "get": {
          "summary": "Check donation payment status",
          "description": "Returns the current status of a donation by order ID",
          "tags": [
            "Donation"
          ],
          "security": [],
          "parameters": [
            {
              "in": "path",
              "name": "orderId",
              "required": true,
              "schema": {
                "type": "string"
              },
              "description": "The donation order ID (e.g. DON-1234567890-ABCDEFG)"
            }
          ],
          "responses": {
            "200": {
              "description": "Donation status returned"
            },
            "404": {
              "description": "Donation not found"
            }
          }
        }
      },
      "/donate/recent": {
        "get": {
          "summary": "Get recent successful donations",
          "description": "Returns the 10 most recent confirmed donations and total stats",
          "tags": [
            "Donation"
          ],
          "security": [],
          "responses": {
            "200": {
              "description": "List of recent donations with stats",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "success": {
                        "type": "boolean"
                      },
                      "donations": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "properties": {
                            "name": {
                              "type": "string"
                            },
                            "amount": {
                              "type": "number"
                            },
                            "message": {
                              "type": "string"
                            },
                            "date": {
                              "type": "string"
                            }
                          }
                        }
                      },
                      "stats": {
                        "type": "object",
                        "properties": {
                          "total_amount": {
                            "type": "number"
                          },
                          "total_donations": {
                            "type": "number"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/donate/currencies": {
        "get": {
          "summary": "Get available donation currencies",
          "description": "Returns the list of supported cryptocurrencies for donations",
          "tags": [
            "Donation"
          ],
          "security": [],
          "responses": {
            "200": {
              "description": "Available currencies list",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "success": {
                        "type": "boolean"
                      },
                      "currencies": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "properties": {
                            "code": {
                              "type": "string",
                              "example": "usdttrc20"
                            },
                            "name": {
                              "type": "string",
                              "example": "USDT (TRC20)"
                            },
                            "network": {
                              "type": "string",
                              "example": "TRON"
                            },
                            "min_amount": {
                              "type": "number",
                              "example": 1
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/get/groups": {
        "get": {
          "summary": "Get all groups",
          "description": "Retrieve all World Cup 2026 groups (A-L)",
          "tags": [
            "Groups"
          ],
          "responses": {
            "200": {
              "description": "List of all groups",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "groups": {
                        "type": "array",
                        "items": {
                          "$ref": "#/components/schemas/Group"
                        }
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Error getting groups",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            }
          }
        }
      },
      "/get/group": {
        "get": {
          "summary": "Get group by name",
          "description": "Retrieve a specific group and its teams by name",
          "tags": [
            "Groups"
          ],
          "parameters": [
            {
              "in": "query",
              "name": "name",
              "required": true,
              "schema": {
                "type": "string"
              },
              "description": "Group name (A-L)",
              "example": "A"
            }
          ],
          "responses": {
            "200": {
              "description": "Group details with teams",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "group": {
                        "$ref": "#/components/schemas/Group"
                      },
                      "teams": {
                        "type": "array",
                        "items": {
                          "$ref": "#/components/schemas/Team"
                        }
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Error getting group or no query declared",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            }
          }
        }
      },
      "/get/teams": {
        "get": {
          "summary": "Get all teams",
          "description": "Retrieve all teams or filter by group",
          "tags": [
            "Teams"
          ],
          "parameters": [
            {
              "in": "query",
              "name": "group",
              "required": false,
              "schema": {
                "type": "string"
              },
              "description": "Filter teams by group name (A-L)",
              "example": "A"
            }
          ],
          "responses": {
            "200": {
              "description": "List of teams",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "teams": {
                        "type": "array",
                        "items": {
                          "$ref": "#/components/schemas/Team"
                        }
                      },
                      "group": {
                        "$ref": "#/components/schemas/Group"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Error getting teams",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            }
          }
        }
      },
      "/get/team/{idTeam}": {
        "get": {
          "summary": "Get team by ID",
          "description": "Retrieve a specific team with group and games by ID",
          "tags": [
            "Teams"
          ],
          "parameters": [
            {
              "in": "path",
              "name": "idTeam",
              "required": true,
              "schema": {
                "type": "string"
              },
              "description": "Team ID"
            }
          ],
          "responses": {
            "200": {
              "description": "Team details",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "team": {
                        "$ref": "#/components/schemas/Team"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Error getting team",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            }
          }
        }
      },
      "/get/team": {
        "get": {
          "summary": "Get team by name",
          "description": "Retrieve a specific team with group and games by name",
          "tags": [
            "Teams"
          ],
          "parameters": [
            {
              "in": "query",
              "name": "name",
              "required": true,
              "schema": {
                "type": "string"
              },
              "description": "Team name",
              "example": "Brazil"
            }
          ],
          "responses": {
            "200": {
              "description": "Team details",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "team": {
                        "$ref": "#/components/schemas/Team"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Error getting team or no query declared",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            }
          }
        }
      },
      "/get/games": {
        "get": {
          "summary": "Get all games",
          "description": "Retrieve all World Cup 2026 matches with team names",
          "tags": [
            "Games"
          ],
          "responses": {
            "200": {
              "description": "List of all games with team names",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "games": {
                        "type": "array",
                        "items": {
                          "allOf": [
                            {
                              "$ref": "#/components/schemas/Game"
                            },
                            {
                              "type": "object",
                              "properties": {
                                "home_team_name_en": {
                                  "type": "string",
                                  "description": "Home team English name"
                                },
                                "home_team_name_fa": {
                                  "type": "string",
                                  "description": "Home team Persian name"
                                },
                                "away_team_name_en": {
                                  "type": "string",
                                  "description": "Away team English name"
                                },
                                "away_team_name_fa": {
                                  "type": "string",
                                  "description": "Away team Persian name"
                                }
                              }
                            }
                          ]
                        }
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Error getting games",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            }
          }
        }
      },
      "/get/game/{idGame}": {
        "get": {
          "summary": "Get game by ID",
          "description": "Retrieve a specific game with teams by ID",
          "tags": [
            "Games"
          ],
          "parameters": [
            {
              "in": "path",
              "name": "idGame",
              "required": true,
              "schema": {
                "type": "string"
              },
              "description": "Game ID"
            }
          ],
          "responses": {
            "200": {
              "description": "Game details",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "game": {
                        "$ref": "#/components/schemas/Game"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Error getting game",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/Error"
                  }
                }
              }
            }
          }
        }
      },
      "/get/stadiums": {
        "get": {
          "summary": "Get all stadiums",
          "description": "Retrieve all World Cup 2026 stadiums",
          "tags": [
            "Stadiums"
          ],
          "responses": {
            "200": {
              "description": "List of all stadiums",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "stadiums": {
                        "type": "array"
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Error getting stadiums"
            }
          }
        }
      },
      "/get/stadium/{id}": {
        "get": {
          "summary": "Get stadium by ID",
          "description": "Retrieve a specific stadium by ID",
          "tags": [
            "Stadiums"
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string"
              },
              "description": "Stadium ID"
            }
          ],
          "responses": {
            "200": {
              "description": "Stadium details"
            },
            "400": {
              "description": "Error getting stadium"
            },
            "404": {
              "description": "Stadium not found"
            }
          }
        }
      },
      "/health": {
        "get": {
          "summary": "Health check endpoint",
          "description": "Check the health status of the API and database connection",
          "tags": [
            "Health"
          ],
          "security": [],
          "responses": {
            "200": {
              "description": "Service is healthy",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "status": {
                        "type": "string",
                        "example": "healthy"
                      },
                      "timestamp": {
                        "type": "string",
                        "format": "date-time"
                      },
                      "uptime": {
                        "type": "number",
                        "description": "Server uptime in seconds"
                      },
                      "version": {
                        "type": "string",
                        "example": "1.0.5"
                      },
                      "database": {
                        "type": "object",
                        "properties": {
                          "status": {
                            "type": "string",
                            "example": "connected"
                          },
                          "name": {
                            "type": "string"
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            "503": {
              "description": "Service is unhealthy"
            }
          }
        }
      },
      "/api/health": {
        "get": {
          "summary": "API health check (alias)",
          "description": "Alternative endpoint for health check",
          "tags": [
            "Health"
          ],
          "security": [],
          "responses": {
            "200": {
              "description": "Service is healthy"
            }
          }
        }
      },
      "/": {
        "get": {
          "summary": "Welcome endpoint",
          "description": "Returns API welcome message",
          "tags": [
            "General"
          ],
          "security": [],
          "responses": {
            "200": {
              "description": "Welcome message",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "message": {
                        "type": "string",
                        "example": "Welcome to FIFA World Cup 2026 API"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "tags": []
  },
  "customOptions": {}
};
  url = options.swaggerUrl || url
  var urls = options.swaggerUrls
  var customOptions = options.customOptions
  var spec1 = options.swaggerDoc
  var swaggerOptions = {
    spec: spec1,
    url: url,
    urls: urls,
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl
    ],
    layout: "StandaloneLayout"
  }
  for (var attrname in customOptions) {
    swaggerOptions[attrname] = customOptions[attrname];
  }
  var ui = SwaggerUIBundle(swaggerOptions)

  if (customOptions.oauth) {
    ui.initOAuth(customOptions.oauth)
  }

  if (customOptions.preauthorizeApiKey) {
    const key = customOptions.preauthorizeApiKey.authDefinitionKey;
    const value = customOptions.preauthorizeApiKey.apiKeyValue;
    if (!!key && !!value) {
      const pid = setInterval(() => {
        const authorized = ui.preauthorizeApiKey(key, value);
        if(!!authorized) clearInterval(pid);
      }, 500)

    }
  }

  if (customOptions.authAction) {
    ui.authActions.authorize(customOptions.authAction)
  }

  window.ui = ui
}
