package db

import (
	"github.com/redis/go-redis/v9"
)

var RedisClient *redis.Client

func InitRedis(addr string) {
	if addr == "" {
		addr = "localhost:6379"
	}
	RedisClient = redis.NewClient(&redis.Options{
		Addr: addr,
	})
}
