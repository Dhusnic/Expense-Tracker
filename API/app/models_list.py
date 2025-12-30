from .auth.models import User
from .expense_tracker.models import Transaction, Category, Account, Contact, Budget, UpiProvider


models_list = [
    User,
    Transaction,
    Category,
    Account,
    Contact,
    Budget,
    UpiProvider
]