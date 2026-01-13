from .auth.models import User
from .expense_tracker.models import Transaction, Account, Contact, Budget, UpiProvider
from .categories.models import Category

models_list = [
    User,
    Transaction,
    Category,
    Account,
    Contact,
    Budget,
    UpiProvider,
    Category
]

dynamodb_models_list = [
    User,
    Transaction,
    Category,
    Account,
    Contact,
    Budget,
    UpiProvider,
    Category
]